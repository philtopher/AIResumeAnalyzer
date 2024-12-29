import { useState, useEffect } from "react";

type StrengthResult = {
  score: number;
  feedback: string[];
};

export function usePasswordStrength(password: string) {
  const [result, setResult] = useState<StrengthResult>({ score: 0, feedback: [] });

  useEffect(() => {
    if (!password) {
      setResult({ score: 0, feedback: [] });
      return;
    }

    // Simple password strength rules
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length < 8) {
      feedback.push("Password should be at least 8 characters long");
    } else {
      score += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      feedback.push("Add uppercase letters");
    } else {
      score += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      feedback.push("Add lowercase letters");
    } else {
      score += 1;
    }

    // Numbers check
    if (!/\d/.test(password)) {
      feedback.push("Add numbers");
    } else {
      score += 1;
    }

    // Special characters check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push("Add special characters");
    } else {
      score += 1;
    }

    setResult({ score: Math.min(score, 4), feedback });
  }, [password]);

  const strengthColors = {
    0: "bg-red-500",
    1: "bg-orange-500",
    2: "bg-yellow-500",
    3: "bg-green-500",
    4: "bg-green-600",
  };

  const strengthLabels = {
    0: "Very Weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  return {
    score: result.score,
    feedback: result.feedback,
    color: strengthColors[result.score as keyof typeof strengthColors],
    label: strengthLabels[result.score as keyof typeof strengthLabels],
  };
}