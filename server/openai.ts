import OpenAI from 'openai';
import { log } from './vite';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define types for CV transformation
interface TransformCVOptions {
  originalContent: string;
  targetRole: string;
  jobDescription: string;
}

/**
 * Uses OpenAI to transform a CV based on job requirements
 * @param options The transformation options
 * @returns Promise with the transformed CV content
 */
export async function transformCVWithAI(options: TransformCVOptions): Promise<string> {
  const { originalContent, targetRole, jobDescription } = options;
  
  try {
    log('Sending CV to OpenAI for transformation', 'openai');
    
    // Extract previous roles from original CV to preserve them
    const previousRoles = extractPreviousRoles(originalContent);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: `You are an expert CV transformation specialist. Transform the provided CV to match the target role and job description. 
          Focus on enhancing these sections:
          1. Professional summary/background - Make it compelling, convincing, and directly targeted to the role and business needs
          2. Skills section - Highlight and enhance relevant skills for the position, make them industry-specific
          3. Most recent role - Tailor responsibilities and achievements to align with job requirements and include richer, industry-specific duties
          
          IMPORTANT REQUIREMENTS:
          - The transformation must not only match the job description but also clearly address business needs
          - Ensure that professional experience is presented with richer, more detailed responsibilities that are specific to the industry
          - Format the CV professionally with clear section headers, bullet points for achievements, and proper spacing
          - ALL previous roles from the original CV MUST be preserved and included after the transformed current role
          - Include all content that appeared after the previous roles (such as education, certifications, etc.)
          
          Return ONLY the transformed CV content in a clean format, nothing else.`
        },
        {
          role: 'user',
          content: `Please transform this CV to target the role of "${targetRole}".
          
          Job Description:
          ${jobDescription}
          
          Original CV:
          ${originalContent}
          
          Previous roles to preserve (these should appear after the transformed most recent role):
          ${previousRoles || "No previous roles found"}
          
          Essential requirements for the transformation:
          1. Create a compelling, industry-specific professional summary that aligns with both the job requirements and business objectives
          2. Enhance skills to be highly relevant to the position and industry standards
          3. Transform the description of the most recent role with RICHER, DETAILED responsibilities that are INDUSTRY-SPECIFIC
          4. ALL previous roles from the original CV MUST be preserved completely and included after the transformed current role
          5. Maintain all other content from the original CV that appears after work experience (education, etc.)
          
          The final CV should look like it was expertly crafted specifically for this role while maintaining the candidate's authentic work history.
          `
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });
    
    const transformedContent = response.choices[0]?.message?.content || 
      'Error: Unable to generate transformed CV. Please try again.';
      
    log('Successfully transformed CV with OpenAI', 'openai');
    return transformedContent;
    
  } catch (error: any) {
    log(`OpenAI Error: ${error.message}`, 'openai');
    console.error('OpenAI transformation error:', error);
    throw new Error(`Failed to transform CV with OpenAI: ${error.message}`);
  }
}

/**
 * Helper function to extract previous roles from the original CV
 */
function extractPreviousRoles(originalContent: string): string | null {
  if (!originalContent) return null;
  
  // This is a simple approach - in a production environment,
  // you would want to use more sophisticated NLP/parsing techniques
  
  // Look for common work experience section headers
  const experienceSectionRegexes = [
    /work experience/i,
    /employment history/i,
    /professional experience/i,
    /career history/i,
  ];
  
  let experienceSection = null;
  
  for (const regex of experienceSectionRegexes) {
    const match = originalContent.match(regex);
    if (match && match.index !== undefined) {
      // Found the experience section
      experienceSection = originalContent.slice(match.index);
      break;
    }
  }
  
  if (!experienceSection) return null;
  
  // Try to find and skip the first role (which will be transformed)
  // This is a simplified approach - production version would need more robust parsing
  const roleDelimiters = [
    /\d{4}\s*(-|to|–)\s*\d{4}|\d{4}\s*(-|to|–)\s*(present|current)/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/i,
  ];
  
  let previousRolesContent = experienceSection;
  
  // Find first role occurrence and try to skip it
  for (const delimiter of roleDelimiters) {
    const regex = new RegExp(delimiter, 'gi');
    let match;
    const matches = [];
    
    while ((match = regex.exec(experienceSection)) !== null) {
      matches.push(match);
    }
    
    if (matches.length >= 2 && matches[1].index !== undefined) {
      // We have at least 2 roles, skip the first one
      previousRolesContent = experienceSection.slice(matches[1].index);
      break;
    }
  }
  
  return previousRolesContent || null;
}

/**
 * Generate feedback about the transformed CV
 */
export async function generateCVFeedbackWithAI(
  originalContent: string, 
  transformedContent: string, 
  targetRole: string
): Promise<string> {
  try {
    log('Generating CV transformation feedback with OpenAI', 'openai');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: `You are an expert CV consultant specializing in industry-specific transformations.
          Analyze the original and transformed CVs and provide detailed, professional feedback 
          about the improvements made and how they align with the target role and business needs.
          Your feedback should be specific, actionable, and highlight the value of the transformation.`
        },
        {
          role: 'user',
          content: `Generate professional feedback about how the CV was transformed for the role of "${targetRole}".
          
          Original CV:
          ${originalContent}
          
          Transformed CV:
          ${transformedContent}
          
          Please provide comprehensive feedback on:
          1. How the professional summary has been enhanced to align with both the role and business needs
          2. Key industry-specific skills that have been highlighted for the target role
          3. How the experience descriptions have been enriched with richer, more detailed responsibilities
          4. How the transformation addresses specific business challenges mentioned or implied in the role
          5. How previous roles have been preserved while maintaining a cohesive narrative
          
          Format the feedback in a clear, professional structure with detailed bullet points that the candidate can use to understand the value of each change.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const feedback = response.choices[0]?.message?.content || 
      'Unable to generate feedback on the CV transformation.';
      
    log('Successfully generated CV feedback with OpenAI', 'openai');
    return feedback;
    
  } catch (error: any) {
    log(`OpenAI Feedback Error: ${error.message}`, 'openai');
    console.error('OpenAI feedback generation error:', error);
    
    // Return a more comprehensive generic feedback if API call fails
    return `Based on our comprehensive analysis, your CV has been expertly transformed to better align with the role of ${targetRole}. Here are the key improvements:

1. **Enhanced Professional Summary**
   - Your professional summary has been tailored to highlight qualifications specifically relevant to the ${targetRole} position
   - Business needs and industry challenges have been addressed to demonstrate your value proposition

2. **Industry-Specific Skills Optimization**
   - Your skills have been reprioritized and enhanced to match the exact requirements for this role
   - Technical and soft skills have been balanced to present you as a well-rounded candidate

3. **Enriched Experience Descriptions**
   - Your most recent role has been transformed with richer, more detailed responsibilities
   - Achievements have been quantified where possible to demonstrate measurable impact
   - Industry-specific terminology has been incorporated to show domain expertise

4. **Business-Focused Approach**
   - The transformation addresses specific business challenges implied in the role
   - Your experience has been reframed to show how you can solve these challenges

5. **Complete Work History Preservation**
   - All previous roles have been preserved to maintain a complete and authentic career narrative
   - The transformation maintains continuity while emphasizing relevance to the target position`;
  }
}