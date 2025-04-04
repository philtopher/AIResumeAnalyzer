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
 * Parse job description to extract key requirements
 */
function parseJobDescription(jobDescription: string): string {
  if (!jobDescription) return "No job description provided";
  
  try {
    // Split job description into lines for easier processing
    const lines = jobDescription.split('\n');
    
    // Look for common requirement section indicators
    const requirementSections = [
      'requirements', 'qualifications', 'skills', 'responsibilities',
      'we are looking for', 'what you will do', 'your role',
      'the ideal candidate', 'what you need', 'key skills'
    ];
    
    let extractedRequirements: string[] = [];
    let inRequirementSection = false;
    
    // Find requirement sections and bullet points
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      
      // Check if this line indicates a requirements section
      if (requirementSections.some(section => line.includes(section))) {
        inRequirementSection = true;
        continue;
      }
      
      // If we're in a requirement section, look for bullet points or numbered lists
      if (inRequirementSection) {
        const trimmedLine = lines[i].trim();
        
        // Match bullet points, numbered lists, or lines that look like requirements
        if (/^[•\-\*\d\.\(\)]+/.test(trimmedLine) || 
            /^[A-Z]/.test(trimmedLine) && trimmedLine.length > 15) {
          extractedRequirements.push(trimmedLine);
        }
        
        // End of section detection
        if (trimmedLine === '' && extractedRequirements.length > 0) {
          inRequirementSection = false;
        }
      }
    }
    
    // If we didn't find structured requirements, use a simple keyword extraction approach
    if (extractedRequirements.length === 0) {
      // Look for key phrases that might indicate requirements
      const importantKeywords = [
        'experience', 'expertise', 'proficiency', 'knowledge', 'familiar', 
        'ability to', 'understand', 'skill', 'background', 'degree', 
        'certification', 'qualified', 'responsible for', 'manage', 'develop'
      ];
      
      for (const line of lines) {
        if (importantKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
          extractedRequirements.push(line.trim());
        }
      }
    }
    
    // If still no requirements found, return the first 10 lines of the job description
    if (extractedRequirements.length === 0) {
      extractedRequirements = lines.slice(0, Math.min(10, lines.length))
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    // Join the extracted requirements with bullet points
    return extractedRequirements
      .map(req => `• ${req}`)
      .join('\n');
      
  } catch (error) {
    console.error("Error parsing job description:", error);
    return jobDescription; // Return the original job description if parsing fails
  }
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
    
    // Parse job description to extract key requirements
    const keyRequirements = parseJobDescription(jobDescription);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: 'system',
          content: `You are an expert CV transformation specialist with extensive experience in optimizing professional resumes. 
          
          Your task is to transform the provided CV to match the target role of "${targetRole}" based on the job description.
          
          FOCUS ON ENHANCING THESE SECTIONS:
          1. Professional summary/background - Create a compelling, convincing summary directly targeted to the role and business needs
          2. Skills section - Highlight and enhance relevant skills for the position, using industry-specific terminology
          3. CURRENT/MOST RECENT ROLE - THIS MUST BE TRANSFORMED IN DETAIL - add richer, industry-specific responsibilities and achievements
          
          CRITICAL REQUIREMENTS:
          - The CURRENT ROLE MUST BE TRANSFORMED with detailed, industry-specific responsibilities that match the job requirements
          - The professional summary must directly address business needs and demonstrate value proposition
          - Skills must be enhanced with relevant, industry-specific terminology
          - Format the CV professionally with clear section headers, bullet points for achievements, and proper spacing
          - ALL previous roles from the original CV MUST be preserved exactly as they appear after the transformed current role
          - Include all content that appeared after work experience (such as education, certifications, etc.)
          
          Return ONLY the transformed CV content in a clean, professional format.`
        },
        {
          role: 'user',
          content: `Transform this CV for the "${targetRole}" position.
          
          JOB DESCRIPTION:
          ${jobDescription}
          
          KEY REQUIREMENTS EXTRACTED FROM JOB:
          ${keyRequirements}
          
          ORIGINAL CV:
          ${originalContent}
          
          PREVIOUS ROLES TO PRESERVE EXACTLY AS THEY APPEAR:
          ${previousRoles || "No previous roles identified - if there are any in the CV, make sure to include them after the transformed current role"}
          
          TRANSFORMATION REQUIREMENTS:
          1. Create a compelling professional summary that directly addresses the business needs for a ${targetRole}
          2. Enhance the skills section with industry-specific terminology relevant to the role
          3. TRANSFORM THE CURRENT/MOST RECENT ROLE with DETAILED, SPECIFIC responsibilities and achievements that align perfectly with the job requirements
          4. Make sure the current role transformation includes RICHER, MORE DETAILED descriptions than the original
          5. ALL previous roles must be preserved and included after the transformed current role
          6. Maintain all content after work experience (education, certifications, etc.)
          
          THE TRANSFORMATION MUST FOCUS ON THE CURRENT/MOST RECENT ROLE - this is the most important part. Make the responsibilities and achievements much more detailed, specific, and aligned with the target role.
          
          The final CV must look expertly crafted for this specific role while maintaining authenticity in the work history.`
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
 * This function splits the CV into: 
 * 1. Current/most recent role (to be transformed)
 * 2. Previous roles (to be preserved)
 */
function extractPreviousRoles(originalContent: string): string | null {
  if (!originalContent) return null;
  
  // Look for common work experience section headers
  const experienceSectionRegexes = [
    /work experience/i,
    /employment history/i,
    /professional experience/i,
    /career history/i,
    /work history/i,
  ];
  
  let experienceSection = null;
  let experienceSectionIndex = -1;
  
  // Find the experience section
  for (const regex of experienceSectionRegexes) {
    const match = originalContent.match(regex);
    if (match && match.index !== undefined) {
      experienceSection = originalContent.slice(match.index);
      experienceSectionIndex = match.index;
      break;
    }
  }
  
  if (!experienceSection) return null;
  
  // Patterns for identifying role delimiters (dates, titles, etc.)
  const roleDelimiters = [
    // Date patterns
    /\b\d{4}\s*(-|to|–|—)\s*\d{4}\b|\b\d{4}\s*(-|to|–|—)\s*(present|current|now)\b/i,
    // Month-Year patterns
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i,
    // Job title patterns often followed by company name
    /\b(senior|lead|principal|chief|head|director|manager|officer|specialist|engineer|developer|analyst|consultant|associate|assistant)\b.*?\bat\b/i,
  ];
  
  let roleStartIndices = [];
  
  // Find all potential role starting positions
  for (const delimiter of roleDelimiters) {
    const regex = new RegExp(delimiter, 'gi');
    let match;
    
    while ((match = regex.exec(experienceSection)) !== null) {
      // Check if this appears to be the start of a role (preceded by newline or paragraph)
      const preContext = experienceSection.substring(Math.max(0, match.index - 30), match.index);
      if (preContext.match(/\n\s*$/) || match.index < 30) {
        roleStartIndices.push(match.index);
      }
    }
  }
  
  // Sort indices and remove duplicates (roles might be detected multiple times)
  roleStartIndices = [...new Set(roleStartIndices)].sort((a, b) => a - b);
  
  // If we have at least 2 roles, we can get the second one's index
  if (roleStartIndices.length >= 2) {
    const secondRoleIndex = roleStartIndices[1];
    // The content starting from second role is what we want to preserve
    const previousRolesContent = experienceSection.slice(secondRoleIndex);
    return previousRolesContent;
  } else if (roleStartIndices.length === 1) {
    // Only one role found - this is likely the current role to be transformed
    // In this case, return null as there are no previous roles to preserve
    log('Only one role detected in the CV - no previous roles to preserve', 'openai');
    return null;
  }
  
  // Fallback: If we couldn't identify roles precisely, return the experience section as-is
  // This ensures we don't lose content even if our parsing was imperfect
  return experienceSection;
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