"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { getAllAppConfigs } from "@/lib/api/appconfig";
import { updateAgent } from "@/lib/api/agent";
import { AppConfig } from "@/lib/types/appconfig";
import { getApiKey } from "@/lib/api/util";
import { toast } from "sonner";
import { useMetaInfo } from "@/components/context/metainfo";
import { useApps } from "@/hooks/use-app";
interface AgentInstructionFilterFormProps {
  children: React.ReactNode;
  projectId: string;
  agentId: string;
  initialInstructions?: Record<string, string>;
  allowedApps?: string[];
  onSaveSuccess?: () => void;
}

export function AgentInstructionFilterForm({
  children,
  projectId,
  agentId,
  initialInstructions = {},
  allowedApps = [],
  onSaveSuccess,
}: AgentInstructionFilterFormProps) {
  const { activeProject, accessToken } = useMetaInfo();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [appConfigs, setAppConfigs] = useState<AppConfig[]>([]);
  const { data: apps, isPending, isError } = useApps();
  const [instructions, setInstructions] =
    useState<Record<string, string>>(initialInstructions);

  // Fetch App configurations and App data
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const apiKey = getApiKey(activeProject);

        // Get App configurations
        const configs = await getAllAppConfigs(apiKey);
        setAppConfigs(configs);

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Failed to load app data");
        setLoading(false);
      }
    };

    fetchData();
  }, [open, activeProject]);

  // Initialize instruction data when dialog opens
  useEffect(() => {
    if (open && initialInstructions) {
      setInstructions(initialInstructions);
    }
  }, [open, initialInstructions]);

  // Save custom instructions
  const handleSave = async () => {
    try {
      const cleanedInstructions = Object.entries(instructions).reduce(
        (acc, [key, value]) => {
          if (value && value.trim() !== "") {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // Update agent
      await updateAgent(
        projectId,
        agentId,
        accessToken,
        undefined,
        undefined,
        undefined,
        cleanedInstructions,
      );

      // Update local instructions state
      setInstructions(cleanedInstructions);

      toast.success("Custom instruction saved");
      setOpen(false);
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Failed to save custom instruction:", error);
      toast.error("Failed to save custom instruction");
    }
  };

  // Update specific App function instruction
  const handleInstructionChange = (
    appName: string,
    functionName: string,
    value: string,
  ) => {
    const key = `${functionName}`;
    setInstructions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Get instruction for specific App function
  const getInstruction = (appName: string, functionName: string) => {
    const key = `${functionName}`;
    return instructions[key] || "";
  };

  // Save single function instruction
  const handleSaveFunction = async (appName: string, functionName: string) => {
    try {
      // Create a copy of current instructions
      const currentInstructions = { ...instructions };

      // Get instruction key
      const key = `${functionName}`;

      // If instruction is empty, remove it from instructions set
      if (!currentInstructions[key] || currentInstructions[key].trim() === "") {
        delete currentInstructions[key];
      }

      // Update agent
      await updateAgent(
        projectId,
        agentId,
        accessToken,
        undefined,
        undefined,
        undefined,
        currentInstructions,
      );

      // Update local instructions state
      setInstructions(currentInstructions);

      toast.success(`Instruction for ${functionName} saved`);
    } catch (error) {
      console.error("Failed to save function instruction:", error);
      toast.error("Failed to save instruction");
    }
  };

  // Delete single function instruction
  const handleDeleteFunction = async (
    appName: string,
    functionName: string,
  ) => {
    try {
      // Create a copy of current instructions
      const currentInstructions = { ...instructions };

      // Get instruction key
      const key = `${functionName}`;

      // Remove the instruction
      delete currentInstructions[key];

      // Update agent
      await updateAgent(
        projectId,
        agentId,
        accessToken,
        undefined,
        undefined,
        undefined,
        currentInstructions,
      );

      // Update local instructions state
      setInstructions(currentInstructions);

      toast.success(`Instruction for ${functionName} deleted`);
    } catch (error) {
      console.error("Failed to delete function instruction:", error);
      toast.error("Failed to delete instruction");
    }
  };

  // Match App name with app_name from AppConfig
  const getMatchingApp = (appConfigName: string) => {
    return apps?.find((app) => app.name === appConfigName);
  };

  // Filter app configs to only show those in allowedApps
  const filteredAppConfigs = appConfigs.filter((config) =>
    allowedApps.includes(config.app_name),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(newState) => {
        if (open && !newState && onSaveSuccess) {
          onSaveSuccess();
        }
        setOpen(newState);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Instruction Configuration</DialogTitle>
        </DialogHeader>

        <Separator className="my-4" />

        {loading || isPending || isError ? (
          <div className="flex justify-center py-6">
            <p>Loading...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {filteredAppConfigs.length > 0 ? (
                  filteredAppConfigs.map((config) => {
                    const matchingApp = getMatchingApp(config.app_name);
                    const functions = matchingApp?.functions || [];

                    return (
                      <AccordionItem
                        key={config.app_name}
                        value={config.app_name}
                        className="border rounded-md mb-2 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 hover:bg-gray-50 py-3 rounded-md">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {config.app_name}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 p-4 border-t">
                            {functions.length > 0 ? (
                              functions.map((func) => (
                                <div
                                  key={func.name}
                                  className=" bg-gray-50 p-3 rounded-md"
                                >
                                  <div>
                                    <div className="font-medium text-sm overflow-hidden p-2 text-ellipsis">
                                      {func.name}
                                    </div>
                                    <div className="flex gap-2">
                                      <Textarea
                                        value={getInstruction(
                                          config.app_name,
                                          func.name,
                                        )}
                                        onChange={(e) =>
                                          handleInstructionChange(
                                            config.app_name,
                                            func.name,
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Enter custom instruction..."
                                        className="flex-1 bg-white w-full py-1.5 overflow-y-auto resize-none leading-normal"
                                      />
                                      <div className="flex flex-col gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-[#1CD1AF] hover:bg-[#19bd9e] text-white border-none w-20"
                                          onClick={() =>
                                            handleSaveFunction(
                                              config.app_name,
                                              func.name,
                                            )
                                          }
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="bg-red-500 hover:bg-red-600 text-white border-none w-20"
                                          onClick={() =>
                                            handleDeleteFunction(
                                              config.app_name,
                                              func.name,
                                            )
                                          }
                                        >
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                <p className="text-sm">
                                  No functions available for this app
                                </p>
                                <p className="text-xs mt-1">
                                  Please select another app to configure
                                </p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })
                ) : (
                  <div className="border rounded-md p-8 text-center">
                    <p className="text-gray-500">
                      No allowed app configurations available
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Please enable apps in the Edit Allowed Apps section first
                    </p>
                  </div>
                )}
              </Accordion>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-[#1CD1AF] hover:bg-[#19bd9e] text-white"
              >
                Save All Configurations
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
