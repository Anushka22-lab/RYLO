const { GoogleGenAI } = require("@google/genai");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

// =====================================================
// INTERVIEW REPORT SCHEMA
// =====================================================

const interviewReportJsonSchema = {
    type: "object",

    properties: {
        title: {
            type: "string",
            description: "The job title extracted from the job description."
        },

        matchScore: {
            type: "number",
            description: "Candidate match score between 0 and 100."
        },

        technicalQuestions: {
            type: "array",
            description: "Technical interview questions.",

            items: {
                type: "object",

                properties: {
                    question: {
                        type: "string"
                    },

                    intention: {
                        type: "string"
                    },

                    answer: {
                        type: "string"
                    }
                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        behavioralQuestions: {
            type: "array",
            description: "Behavioral interview questions.",

            items: {
                type: "object",

                properties: {
                    question: {
                        type: "string"
                    },

                    intention: {
                        type: "string"
                    },

                    answer: {
                        type: "string"
                    }
                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        skillGaps: {
            type: "array",
            description: "Skills missing from the candidate profile.",

            items: {
                type: "object",

                properties: {
                    skill: {
                        type: "string"
                    },

                    severity: {
                        type: "string",

                        enum: [
                            "low",
                            "medium",
                            "high"
                        ]
                    }
                },

                required: [
                    "skill",
                    "severity"
                ]
            }
        },

        preparationPlan: {
            type: "array",
            description: "Seven day interview preparation plan.",

            items: {
                type: "object",

                properties: {
                    day: {
                        type: "integer"
                    },

                    focus: {
                        type: "string"
                    },

                    tasks: {
                        type: "array",

                        items: {
                            type: "string"
                        }
                    }
                },

                required: [
                    "day",
                    "focus",
                    "tasks"
                ]
            }
        }
    },

    required: [
        "title",
        "matchScore",
        "technicalQuestions",
        "behavioralQuestions",
        "skillGaps",
        "preparationPlan"
    ]
};

// =====================================================
// GENERATE INTERVIEW REPORT
// =====================================================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
You are an expert technical recruiter and interview preparation coach.

Generate a complete interview preparation report for this candidate.

CANDIDATE RESUME:
${resume}

CANDIDATE SELF DESCRIPTION:
${selfDescription}

JOB DESCRIPTION:
${jobDescription}

IMPORTANT OUTPUT REQUIREMENTS:

1. Extract the exact job title from the job description.

2. Calculate a realistic match score from 0 to 100.

3. Generate EXACTLY 8 technical interview questions.

Each technical question MUST be an OBJECT with:

question
intention
answer

Example:

{
    "question": "What is middleware in Express.js?",
    "intention": "To evaluate understanding of Express architecture.",
    "answer": "Explain that middleware functions..."
}

4. Generate EXACTLY 6 behavioral interview questions.

Each behavioral question MUST be an OBJECT with:

question
intention
answer

5. Generate EXACTLY 4 skill gaps.

Each skill gap MUST be an OBJECT with:

skill
severity

severity must be one of:

low
medium
high

6. Generate EXACTLY 7 preparation-plan days.

Each day MUST be an OBJECT with:

day
focus
tasks

tasks must be an ARRAY OF STRINGS.

VERY IMPORTANT:

technicalQuestions MUST be an array of objects.

behavioralQuestions MUST be an array of objects.

skillGaps MUST be an array of objects.

preparationPlan MUST be an array of objects.

NEVER return numbers such as:

[0,1,2,3]

NEVER return null.

NEVER return strings instead of objects.

Do not leave any array empty.

Use the candidate's actual resume and the job description to make the questions relevant.

Return ONLY JSON matching the provided schema.
`;

    try {

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: prompt,

            config: {
                responseMimeType: "application/json",
                responseJsonSchema: interviewReportJsonSchema
            }
        });

        const result = JSON.parse(response.text);

        console.log(
            "AI GENERATED REPORT:",
            JSON.stringify(result, null, 2)
        );

        return result;

    } catch (error) {

        console.error(
            "Interview report generation failed:",
            error
        );

        throw error;
    }
}

// =====================================================
// PDF GENERATOR
// =====================================================

async function generatePdfFromHtml(htmlContent) {

    let browser;

    try {

        console.log("Launching Puppeteer...");

        browser = await puppeteer.launch({

            headless: true,

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-zygote"
            ]
        });

        console.log("Puppeteer launched successfully.");

        const page = await browser.newPage();

        // Set viewport for consistent PDF rendering
        await page.setViewport({
            width: 1280,
            height: 1800,
            deviceScaleFactor: 1
        });

        console.log("Setting HTML content...");

        await page.setContent(
            htmlContent,
            {
                waitUntil: "networkidle2",
                timeout: 30000
            }
        );

        // Wait for fonts/images to finish loading
        await page.evaluate(async () => {

            if (document.fonts) {
                await document.fonts.ready;
            }

            const images = Array.from(
                document.images
            );

            await Promise.all(
                images.map((image) => {

                    if (image.complete) {
                        return Promise.resolve();
                    }

                    return new Promise((resolve) => {

                        image.addEventListener(
                            "load",
                            resolve,
                            { once: true }
                        );

                        image.addEventListener(
                            "error",
                            resolve,
                            { once: true }
                        );
                    });
                })
            );
        });

        console.log("Generating PDF...");

        const pdfBuffer = await page.pdf({

            format: "A4",

            printBackground: true,

            preferCSSPageSize: true,

            margin: {
                top: "15mm",
                bottom: "15mm",
                left: "15mm",
                right: "15mm"
            }
        });

        console.log(
            `PDF generated successfully. Size: ${pdfBuffer.length} bytes`
        );

        return pdfBuffer;

    } catch (error) {

        console.error(
            "Puppeteer PDF generation failed:",
            error
        );

        throw error;

    } finally {

        if (browser) {

            try {

                await browser.close();

                console.log(
                    "Puppeteer browser closed."
                );

            } catch (closeError) {

                console.error(
                    "Failed to close Puppeteer:",
                    closeError
                );
            }
        }
    }
}

// =====================================================
// GENERATE RESUME PDF
// =====================================================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfJsonSchema = {

        type: "object",

        properties: {

            html: {
                type: "string",
                description:
                    "Complete HTML content of the resume."
            }
        },

        required: [
            "html"
        ]
    };

    const prompt = `
Generate a professional ATS-friendly resume.

RESUME:
${resume}

SELF DESCRIPTION:
${selfDescription}

JOB DESCRIPTION:
${jobDescription}

Requirements:

- Tailor the resume to the job description.
- The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience.
- The HTML content should be well-formatted and structured.
- Highlight relevant skills.
- You can highlight content using subtle colors or different font styles, but the overall design should remain simple and professional.
- The resume must be ATS friendly.
- The resume should be easily parsable by ATS systems.
- Highlight relevant projects and experience.
- Do not invent experience.
- Keep it professional.
- Keep it 1-2 pages only.
- Focus on quality rather than quantity.
- The content should not sound AI-generated.
- Make it as close as possible to a real human-written resume.
- Use clean HTML.
- Use simple professional styling.
- Do not use external JavaScript.
- Return ONLY the HTML inside the JSON field.
`;

    try {

        console.log(
            "Generating resume HTML using Gemini..."
        );

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: prompt,

            config: {
                responseMimeType: "application/json",
                responseJsonSchema: resumePdfJsonSchema
            }
        });

        const jsonContent = JSON.parse(
            response.text
        );

        if (
            !jsonContent ||
            typeof jsonContent.html !== "string" ||
            !jsonContent.html.trim()
        ) {

            throw new Error(
                "Gemini returned invalid resume HTML."
            );
        }

        console.log(
            "Resume HTML generated successfully."
        );

        const pdfBuffer =
            await generatePdfFromHtml(
                jsonContent.html
            );

        return pdfBuffer;

    } catch (error) {

        console.error(
            "Resume PDF generation failed:",
            error
        );

        throw error;
    }
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
    generateInterviewReport,
    generateResumePdf
};