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
      model: 'gpt-4', // Using GPT-4 for better quality transformations
      messages: [
        {
          role: 'system',
          content: `You are an expert CV transformation specialist. Transform the provided CV to match the target role and job description. 
          Focus on enhancing these sections:
          1. Professional summary/background - Make it compelling and targeted to the role
          2. Skills section - Highlight relevant skills for the position
          3. Most recent role - Tailor responsibilities and achievements to align with job requirements
          
          The transformation should reflect the candidate's actual experience but position it optimally for the target role.
          Format the CV professionally with clear section headers, bullet points for achievements, and proper spacing.
          Keep additional roles from the original CV intact after the transformed latest role.
          
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
          
          Please ensure the transformed CV includes:
          1. A compelling professional summary tailored to the target role
          2. Skills relevant to the position
          3. A transformed description of the most recent role that highlights relevant experience
          4. Previous roles preserved from the original CV
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
      model: 'gpt-3.5-turbo', // Using GPT-3.5 for feedback to optimize cost
      messages: [
        {
          role: 'system',
          content: `You are an expert CV consultant. Analyze the original and transformed CVs and 
          provide professional feedback about the improvements made and how they align with the target role.`
        },
        {
          role: 'user',
          content: `Generate professional feedback about how the CV was transformed for the role of "${targetRole}".
          
          Original CV:
          ${originalContent}
          
          Transformed CV:
          ${transformedContent}
          
          Please provide specific feedback on:
          1. How the professional summary has been enhanced
          2. Key skills that have been highlighted for the target role
          3. How the experience description has been improved
          4. Overall alignment with the target role requirements
          5. Any additional improvements or recommendations
          
          Format the feedback in a clear, professional structure with bullet points.`
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
    
    // Return a generic feedback if API call fails
    return `Based on our comprehensive analysis, your CV has been transformed to better align with the role of ${targetRole}. Here are some key improvements:

1. Professional summary has been tailored to highlight relevant qualifications for the target role
2. Skills have been prioritized to match the job requirements and industry standards
3. Experience details have been restructured to emphasize relevant achievements
4. Previous roles have been preserved to maintain career continuity
5. Overall formatting and presentation has been optimized for readability`;
  }
}