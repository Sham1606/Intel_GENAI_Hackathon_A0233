import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const NewPrompt = ({ data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });
  const [showOptions, setShowOptions] = useState(false); // State to handle the options box
  const [fileType, setFileType] = useState(""); // State to track selected file type

  const chat = model.startChat({
    history: [
      data?.history.map(({ role, parts }) => ({
        role,
        parts: [{ text: parts[0].text }],
      })),
    ],
    generationConfig: {
      // maxOutputTokens: 100,
    },
  });

  const endRef = useRef(null);
  const formRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data, question, answer, img.dbData]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.length ? question : undefined,
          answer,
          img: img.dbData?.filePath || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient
        .invalidateQueries({ queryKey: ["chat", data._id] })
        .then(() => {
          formRef.current.reset();
          setQuestion("");
          setAnswer("");
          setImg({
            isLoading: false,
            error: "",
            dbData: {},
            aiData: {},
          });
        });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const add = async (text, isInitial) => {
    if (!isInitial) setQuestion(text);

    try {
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length ? [img.aiData, text] : [text]
      );
      let accumulatedText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        console.log(chunkText);
        accumulatedText += chunkText;
        setAnswer(accumulatedText);
      }

      mutation.mutate();
    } catch (err) {
      console.log(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const text = e.target.text.value;
    if (!text) return;

    add(text, false);
  };

  // Handle option selection (file input click)
  const handleOptionClick = (option) => {
    setShowOptions(false); // Hide options box when an option is clicked
    switch (option) {
      case "image":
        imageInputRef.current.click();
        break;
      case "video":
        videoInputRef.current.click();
        break;
      case "audio":
        audioInputRef.current.click();
        break;
      default:
        break;
    }
  };

  return (
    <>
      {/* ADD NEW CHAT */}
      {img.isLoading && <div className="">Loading...</div>}
      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
          path={img.dbData?.filePath}
          width="380"
          transformation={[{ width: 380 }]}
        />
      )}
      {question && <div className="message user">{question}</div>}
      {answer && (
        <div className="message">
          <Markdown>{answer}</Markdown>
        </div>
      )}
      <div className="endChat" ref={endRef}></div>

      {/* File options for analyzing media */}
      {showOptions && (
        <div className="fileOptionsBox">
          <button onClick={() => handleOptionClick("image")}>
            Analyze Image
          </button>
          <button onClick={() => handleOptionClick("video")}>
            Analyze Video
          </button>
          <button onClick={() => handleOptionClick("audio")}>
            Analyze Audio
          </button>
        </div>
      )}

      <form className="newForm" onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg} />

        {/* Hidden file inputs for different media types */}
        <input
          id="image"
          type="file"
          accept="image/*"
          hidden
          ref={imageInputRef}
        />
        <input
          id="video"
          type="file"
          accept="video/*"
          hidden
          ref={videoInputRef}
        />
        <input
          id="audio"
          type="file"
          accept="audio/*"
          hidden
          ref={audioInputRef}
        />

        {/* Clicking on the attachment icon to show options */}
        <img
          src="/attachment.png"
          alt="attachment"
          onClick={() => setShowOptions((prev) => !prev)}
          className="attachmentIcon"
        />

        <input type="text" name="text" placeholder="Ask anything..." />
        <button>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  );
};

export default NewPrompt;
