"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { useTimetableStore } from "@/stores/timetableStore";
import { useCourseStore } from "@/stores/courseStore";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Paperclip, X } from "lucide-react";
import AuthDialog from "./auth-dialog";
import {
  lastAssistantMessageIsCompleteWithToolCalls,
  DefaultChatTransport,
  UIMessage,
} from "ai";
import { FileUIPart } from "ai";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";
import { ChatContainerContent, ChatContainerRoot } from "./ui/chat-container";
import { ScrollButton } from "./ui/scroll-button";
import { Message, MessageAvatar, MessageContent } from "./ui/message";
import { Markdown } from "./ui/markdown";
import { Loader } from "./ui/loader";
import { PromptSuggestion } from "./ui/prompt-suggestion";
import { Tool, type ToolPart } from "@/components/ui/tool";
import {
  RateLimitError,
  RateLimitWarning,
} from "@/components/ui/rate-limit-error";

interface CourseChatbotProps {
  className?: string;
}

export function CourseChatbot({ className }: CourseChatbotProps) {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const {
    activeTimetableId,
    activeChatId,
    chats,
    createChat,
    persistTemporaryChat,
    renameChat,
    setActiveChat,
    updateChatMessages,
  } = useTimetableStore();

  const { courses, loadCourses, addCourse, updateCourse, deleteCourse, resetCourses } = useCourseStore();

  const activeChat = activeChatId
    ? chats.find((chat) => chat.id === activeChatId)
    : null;

  const isTemporaryChat = activeChatId?.startsWith("temp-") || false;

  const [input, setInput] = useState("");

  const [fileChatDisplay, setFileChatDisplay] = useState<FileUIPart[]>([]);
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const currentChatIdRef = useRef<string | null>(null);

  const [rateLimitError, setRateLimitError] = useState<any>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<any>(null);

  const { messages, sendMessage, status, setMessages, addToolResult } = useChat(
    {
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: {
          timetable_id: activeTimetableId,
          courses: courses,
        },
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onError: async (error) => {
        console.error("Chat API error:", error);

        if (
          error instanceof Error &&
          (error.message.includes("429") ||
            error.message.includes("Rate limit exceeded"))
        ) {
          try {
            let errorData = null;

            if ("response" in error && error.response) {
              const response = error.response as Response;
              if (response.status === 429) {
                errorData = await response.json();
              }
            } else {
              try {
                errorData = JSON.parse(error.message);
              } catch {
                if (
                  error.message.includes("Rate limit") ||
                  error.message.includes("429")
                ) {
                  errorData = { error: "Rate limit exceeded" };
                }
              }
            }

            if (
              errorData &&
              (errorData.error === "Rate limit exceeded" ||
                errorData.message?.includes("limit"))
            ) {
              setRateLimitError({
                tokensUsed: errorData.details?.tokensUsed || 0,
                tokensRemaining: errorData.details?.tokensRemaining || 0,
                requestsUsed: errorData.details?.requestsUsed || 0,
                requestsRemaining: errorData.details?.requestsRemaining || 0,
                resetTime:
                  errorData.details?.resetTime ||
                  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              });
              return;
            }
          } catch (parseError) {
            console.error("Error parsing rate limit response:", parseError);

            setRateLimitError({
              tokensUsed: 0,
              tokensRemaining: 0,
              requestsUsed: 0,
              requestsRemaining: 0,
              resetTime: new Date(
                Date.now() + 24 * 60 * 60 * 1000
              ).toISOString(),
            });
            return;
          }
        }

        console.error("Non-rate-limit error:", error);
      },
      onFinish: async (onFinish: any) => {
        console.log(onFinish);
  
        const chatId = currentChatIdRef.current || activeChatId;
        if (chatId) {
          try {
            await updateChatMessages(chatId, onFinish.messages);

            if (
              currentChatIdRef.current &&
              currentChatIdRef.current !== activeChatId
            ) {
              setActiveChat(currentChatIdRef.current);
            }

            const lastMessage = onFinish.message;
            if (lastMessage && lastMessage.role === "assistant" && lastMessage.parts) {
              for (const part of lastMessage.parts) {
                if (part.type?.startsWith("tool-") && part.state === "output-available" && part.output) {
                  const toolName = part.type.replace("tool-", "");
                  const toolOutput = part.output;
                  const toolInput = part.input;

                  switch (toolName) {
                    case "addCourse": {
                      const { code, name, sessions, color } = toolInput;
                      console.log(code, name, sessions, color);
                      
                      if (activeTimetableId) {
                        try {
                          await addCourse({
                            timetable_id: activeTimetableId,
                            code,
                            name,
                            color: color || '#FFB3BA',
                            sessions: sessions.map((session: any) => ({
                              ...session,
                              session_id: session.session_id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                            }))
                          });
                          console.log(`Successfully added ${code} - ${name} to your timetable!`);
                        } catch (error) {
                          console.error(`Failed to add course: ${error}`);
                        }
                      } else {
                        console.error("No active timetable selected");
                      }
                      break;
                    }

                    case "updateCourse": {
                      const { courseId, code, name, sessions, color } = toolInput;
                      
                      const existingCourse = useCourseStore.getState().courses.find(c => c.id === courseId);
                      if (existingCourse) {
                        const updatedCourse = {
                          ...existingCourse,
                          ...(code !== undefined && { code }),
                          ...(name !== undefined && { name }),
                          ...(color !== undefined && { color }),
                          ...(sessions !== undefined && {
                            sessions: sessions.map((session: any) => ({
                              ...session,
                              session_id: session.session_id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                            }))
                          })
                        };
                        
                        try {
                          await updateCourse(updatedCourse);
                          console.log(`Successfully updated course ${courseId}!`);
                        } catch (error) {
                          console.error(`Failed to update course: ${error}`);
                        }
                      } else {
                        console.error(`Course with ID ${courseId} not found`);
                      }
                      break;
                    }

                    case "deleteCourse": {
                      const { courseId } = toolInput;
                      
                      try {
                        await deleteCourse(courseId);
                        console.log(`Successfully deleted course ${courseId} from your timetable!`);
                      } catch (error) {
                        console.error(`Failed to delete course: ${error}`);
                      }
                      break;
                    }

                    case "resetCourses": {
                      try {
                        await resetCourses();
                        console.log("Successfully deleted all courses from your timetable!");
                      } catch (error) {
                        console.error(`Failed to reset courses: ${error}`);
                      }
                      break;
                    }

                    case "loadCourses": {
                      if (activeTimetableId) {
                        try {
                          await loadCourses(activeTimetableId);
                          const courses = useCourseStore.getState().courses;
                          console.log(`Successfully loaded ${courses.length} courses from your timetable!`);
                        } catch (error) {
                          console.error(`Failed to load courses: ${error}`);
                        }
                      } else {
                        console.error("No active timetable selected");
                      }
                      break;
                    }
                  }
                }
              }
            }
          } catch (error) {
            console.error("Failed to save assistant message:", error);
          }
        }
      },
    }
  );

  const createChatFromMessage = async (
    userMessage: string
  ): Promise<string | null> => {
    if (!activeTimetableId) {
      setShowAuthDialog(true);
      return null;
    }

    try {
      const newChat = await createChat(activeTimetableId, "New Chat");

      if (!newChat) {
        setShowAuthDialog(true);
        return null;
      }

      const chatName =
        userMessage.length > 50
          ? userMessage.substring(0, 47) + "..."
          : userMessage;
      await renameChat(newChat.id, chatName);
      setActiveChat(newChat.id);

      return newChat.id;
    } catch (error) {
      console.error("Failed to create chat:", error);
      setShowAuthDialog(true);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (input.trim() || (files && files.length > 0)) {
      const userMessageText = input.trim();
      let currentChatId = activeChatId;

      if (currentChatId && activeTimetableId) {
        const activeChat = chats.find((chat) => chat.id === currentChatId);
        const isTemporary = currentChatId.startsWith("temp-");

        if (!activeChat || isTemporary) {
          try {
            const persistedChat = await persistTemporaryChat(
              currentChatId,
              userMessageText
            );

            currentChatId = persistedChat.id;
            currentChatIdRef.current = persistedChat.id;
          } catch (error) {
            console.error("Failed to persist temporary chat:", error);
            setShowAuthDialog(true);
            return;
          }
        }
      } else if (!currentChatId && activeTimetableId) {
        const timetableChats = chats.filter(
          (chat) => chat.timetableId === activeTimetableId
        );

        if (timetableChats.length === 0) {
          currentChatId = await createChatFromMessage(userMessageText);
          if (!currentChatId) {
            return;
          }
        } else {
          currentChatId = timetableChats[0].id;
          setActiveChat(currentChatId);
        }
      }

      sendMessage({
        text: userMessageText,
        files: files,
      });

      setInput("");
      setFileChatDisplay([]);
      setFiles(undefined);
    }
  };

  const isGenerating = status === "streaming";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map((file) => ({
        type: "file" as const,
        filename: file.name,
        mediaType: file.type,
        url: URL.createObjectURL(file),
      }));
      setFileChatDisplay((prev) => [...prev, ...newFiles]);
      setFiles(event.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFileChatDisplay((prev) => prev.filter((_, i) => i !== index));
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!activeChatId && activeTimetableId && chats.length > 0) {
      const timetableChats = chats.filter(
        (chat) => chat.timetableId === activeTimetableId
      );
      if (timetableChats.length > 0) {
        setActiveChat(timetableChats[0].id);
      }
    }

    console.log(activeChat);
  }, [activeChatId, activeTimetableId, chats, setActiveChat]);

  useEffect(() => {
    if (activeChat && activeChat.messages) {
      setMessages(activeChat.messages);
    } else if (isTemporaryChat) {
      setMessages([]);
    } else {
      setMessages([]);
    }
  }, [activeChat, isTemporaryChat, setMessages]);

  return (
    <div className="relative overflow-hidden flex flex-col h-[calc(100vh-100px)] mb-24">
      <div className="relative overflow-hidden flex flex-col h-full mb-1">
        <div className="flex-1 overflow-auto">
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="space-y-4 p-4">
              {rateLimitError && (
                <RateLimitError
                  tokensUsed={rateLimitError.tokensUsed}
                  tokensRemaining={rateLimitError.tokensRemaining}
                  requestsUsed={rateLimitError.requestsUsed}
                  requestsRemaining={rateLimitError.requestsRemaining}
                  resetTime={rateLimitError.resetTime}
                  onRetry={() => {
                    setRateLimitError(null);
                  }}
                  onDismiss={() => setRateLimitError(null)}
                  className="mb-4"
                />
              )}

              {rateLimitWarning && !rateLimitError && (
                <RateLimitWarning
                  tokensUsed={rateLimitWarning.tokensUsed}
                  tokensTotal={rateLimitWarning.tokensTotal}
                  percentage={rateLimitWarning.percentage}
                  onDismiss={() => setRateLimitWarning(null)}
                  className="mb-4"
                />
              )}
              {messages.map((message: any) => {
                const isAssistant = message.role === "assistant";

                const textAndFileContent = message.parts
                  ? message.parts.filter(
                      (part: any) =>
                        part.type === "text" || part.type === "file"
                    )
                  : [];

                const toolContent = message.parts
                  ? message.parts.filter((part: any) =>
                      part.type.startsWith("tool-")
                    )
                  : [];

                return (
                  <div key={message.id} className="space-y-2">
                    {isAssistant && toolContent.length > 0 && (
                      <div className="ml-12 space-y-2">
                        {toolContent.map((part: any, index: number) => {
                          const toolType = part.type.replace("tool-", "");
                          const toolPart: ToolPart = {
                            type: toolType,
                            state: part.state,
                            input: part.input,
                            output: part.output,
                            toolCallId: part.toolCallId,
                            errorText: part.errorText,
                          };

                          return (
                            <Tool
                              key={part.toolCallId || index}
                              className="w-full max-w-md"
                              toolPart={toolPart}
                              defaultOpen={true}
                            />
                          );
                        })}
                      </div>
                    )}

                    <Message
                      className={
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }
                    >
                      {isAssistant && (
                        <MessageAvatar
                          src="/avatars/ai.png"
                          alt="AI Assistant"
                          fallback="AI"
                        />
                      )}
                      <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                        {isAssistant ? (
                          <div className="bg-secondary text-foreground prose rounded-lg p-2">
                            {textAndFileContent.length > 0
                              ? textAndFileContent.map(
                                  (part: any, index: number) => {
                                    switch (part.type) {
                                      case "text":
                                        return (
                                          <Markdown key={index}>
                                            {part.text}
                                          </Markdown>
                                        );

                                      case "file": {
                                        if (
                                          part.mediaType?.startsWith("image/")
                                        ) {
                                          return (
                                            <img
                                              key={index}
                                              src={part.url}
                                              alt={part.filename}
                                              className="max-w-full h-auto rounded-lg mt-2"
                                            />
                                          );
                                        }
                                        break;
                                      }
                                    }
                                    return null;
                                  }
                                )
                              : message.content && (
                                  <Markdown>{message.content}</Markdown>
                                )}
                          </div>
                        ) : (
                          <MessageContent className="bg-primary text-primary-foreground">
                            {message.parts
                              ? message.parts.map(
                                  (part: any, index: number) => {
                                    switch (part.type) {
                                      case "text":
                                        return (
                                          <span key={index}>{part.text}</span>
                                        );

                                      case "file": {
                                        if (
                                          part.mediaType?.startsWith("image/")
                                        ) {
                                          return (
                                            <img
                                              key={index}
                                              src={part.url}
                                              alt={part.filename}
                                              className="max-w-full h-auto rounded-lg mt-2"
                                            />
                                          );
                                        }
                                        break;
                                      }
                                    }

                                    return null;
                                  }
                                )
                              : message.content}
                          </MessageContent>
                        )}
                      </div>
                    </Message>
                  </div>
                );
              })}
              {status === "submitted" && <Loader variant={"typing"} />}
            </ChatContainerContent>
            <div className="absolute right-12 bottom-4">
              <ScrollButton />
            </div>
          </ChatContainerRoot>
        </div>
      </div>

      <div>{courses.map(course => course.name)}</div>

      {messages.length === 0 && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <PromptSuggestion
              onClick={() => {
                setInput("Tell me a joke");
                setTimeout(() => handleSubmit(), 0);
              }}
            >
              Tell me a joke
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("How does this work?");
                setTimeout(() => handleSubmit(), 0);
              }}
            >
              How does this work?
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("Generate an image of a cat");
                setTimeout(() => handleSubmit(), 0);
              }}
            >
              Generate an image of a cat
            </PromptSuggestion>

            <PromptSuggestion
              onClick={() => {
                setInput("Write a poem");
                setTimeout(() => handleSubmit(), 0);
              }}
            >
              Write a poem
            </PromptSuggestion>
            <PromptSuggestion
              onClick={() => {
                setInput("Code a React component");
                setTimeout(() => handleSubmit(), 0);
              }}
            >
              Code a React component
            </PromptSuggestion>
          </div>
        </>
      )}

      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isGenerating}
        onSubmit={handleSubmit}
        className="w-full max-w-(--breakpoint-md)"
      >
        {fileChatDisplay.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {fileChatDisplay.map((file, index) => (
              <div
                key={index}
                className="bg-secondary flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Paperclip className="size-4" />
                <span className="max-w-[120px] truncate">{file.filename}</span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="hover:bg-secondary/50 rounded-full p-1"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <PromptInputTextarea placeholder="Ask me anything..." />

        <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
          <PromptInputAction tooltip="Attach files">
            <label
              htmlFor="file-upload"
              className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl"
            >
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Paperclip className="text-primary size-5" />
            </label>
          </PromptInputAction>

          <PromptInputAction
            tooltip={isGenerating ? "Stop generation" : "Send message"}
          >
            <Button
              variant="default"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleSubmit}
              disabled={
                status !== "ready" &&
                !input.trim() &&
                fileChatDisplay.length === 0
              }
            >
              {isGenerating ? (
                <Square className="size-5 fill-current" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
    </div>
  );
}
