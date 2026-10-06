import { useCallback, useRef } from "react";

// Analysis step that becomes a real chat message
export interface AnalysisStep {
  id: string;
  text: string;
  timestamp: Date;
  isCompleted: boolean;
  role: "assistant";
  content: string;
}

interface UseImageAnalysisProps {
  chatId?: string;
  onAddMessage: (message: any) => void; // Function to add message to chat
  onUpdateMessage: (messageId: string, updates: any) => void; // Function to update existing message
}

export function useImageAnalysis({
  chatId,
  onAddMessage,
  onUpdateMessage,
}: UseImageAnalysisProps) {
  const analysisStepsRef = useRef<Map<string, AnalysisStep>>(new Map());

  // TODO: Save analysis message to database
  // For now, we're focusing on the UI experience
  // Database persistence will be added later
  const saveAnalysisMessage = useCallback(async (message: AnalysisStep) => {
    // Skip database saving for now
    console.log("useImageAnalysis: Analysis step created:");
  }, []);

  const addAnalysisMessage = useCallback(
    (text: string, id: string) => {
      console.log("useImageAnalysis: Creating analysis message:");

      const message: AnalysisStep = {
        id,
        text,
        content: text, // Same as text for now
        timestamp: new Date(),
        isCompleted: false,
        role: "assistant",
      };

      analysisStepsRef.current.set(id, message);

      const messageToAdd = {
        id,
        role: "assistant",
        content: text,
        createdAt: message.timestamp,
        metadata: {
          isAnalysisStep: true,
          isCompleted: false,
          stepId: id,
        },
      };

      console.log("useImageAnalysis: Adding message to chat:");

      // Add to chat immediately
      onAddMessage(messageToAdd);

      // Save to database
      saveAnalysisMessage(message);

      return message;
    },
    [onAddMessage, saveAnalysisMessage],
  );

  const completeAnalysisStep = useCallback(
    (stepId: string) => {
      const step = analysisStepsRef.current.get(stepId);
      if (step) {
        step.isCompleted = true;
        analysisStepsRef.current.set(stepId, step);

        // Update the existing message to mark as completed
        onUpdateMessage(stepId, {
          metadata: {
            isAnalysisStep: true,
            isCompleted: true,
            stepId: stepId,
          },
        });
      }
    },
    [onUpdateMessage],
  );

  const startImageAnalysis = useCallback(() => {
    console.log("useImageAnalysis: startImageAnalysis called");
    const timestamp = Date.now();

    // Step 1: Image analysis - show immediately and keep animating
    console.log("useImageAnalysis: Creating image analysis step");
    const imageStep = addAnalysisMessage(
      "Analyzing image",
      `image-analysis-${timestamp}`,
    );

    // Step 2: Lab analysis - show after 5 seconds and keep animating
    setTimeout(() => {
      console.log("useImageAnalysis: Creating lab analysis step");
      const labStep = addAnalysisMessage(
        "Analyzing Lab Tests",
        `lab-analysis-${timestamp}`,
      );

      // Both steps will be completed when AI response starts streaming
      // via the completeAllAnalysis() call from the chat component
    }, 5000);
  }, [addAnalysisMessage]);

  const completeAllAnalysis = useCallback(() => {
    // Mark all steps as completed
    analysisStepsRef.current.forEach((step, stepId) => {
      if (!step.isCompleted) {
        completeAnalysisStep(stepId);
      }
    });
  }, [completeAnalysisStep]);

  return {
    startImageAnalysis,
    completeAllAnalysis,
  };
}
