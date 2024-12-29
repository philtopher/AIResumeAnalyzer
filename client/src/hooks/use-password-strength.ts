import { useState, useEffect } from "react";
import { zxcvbn } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
};

export function usePasswordStrength(password: string) {
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (password) {
      const score = zxcvbn(password, [], options);
      setResult(score);
    } else {
      setResult(null);
    }
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
    score: result?.score ?? 0,
    feedback: result?.feedback?.suggestions ?? [],
    color: strengthColors[result?.score ?? 0],
    label: strengthLabels[result?.score ?? 0],
  };
}