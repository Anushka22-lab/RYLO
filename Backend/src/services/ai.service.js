const { GoogleGenAI } = require("@google/genai")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


// ===============================
// INTERVIEW REPORT SCHEMA
// ===============================

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
}


// ===============================
// GENERATE INTERVIEW REPORT
// ===============================

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
`


    const response = await ai.models.generateContent({

        model: "gemini-3.6-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json",
            responseJsonSchema: interviewReportJsonSchema
        }

    })


    const result = JSON.parse(response.text)


    console.log(
        "AI GENERATED REPORT:",
        JSON.stringify(result, null, 2)
    )


    return result
}


// ===============================
// PDF GENERATOR
// ===============================

async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await page.setContent(
        htmlContent,
        {
            waitUntil: "networkidle0"
        }
    )

    const pdfBuffer = await page.pdf({
        format: "A4",

        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}


// ===============================
// GENERATE RESUME PDF
// ===============================

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
                description: "Complete HTML content of the resume."
            }

        },

        required: ["html"]

    }


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
- The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
- the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
- Highlight relevant skills.
-you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
-The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
-The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
- Highlight relevant projects and experience.
- Do not invent experience.
- Keep it professional.
- Keep it 1-2 page only.
- Make it ATS friendly.
-The content of resume should not sound like it's generated by AI and should be as close as possible to a real human-written resume.
- Use clean HTML.
- Use simple professional styling.
- Return only the HTML inside the JSON field.
`


    const response = await ai.models.generateContent({

        model: "gemini-3.6-flash",

        contents: prompt,

        config: {
            responseMimeType: "application/json",
            responseJsonSchema: resumePdfJsonSchema
        }

    })


    const jsonContent = JSON.parse(response.text)


    const pdfBuffer = await generatePdfFromHtml(
        jsonContent.html
    )


    return pdfBuffer
}


// ===============================
// EXPORT
// ===============================

module.exports = {
    generateInterviewReport,
    generateResumePdf
}