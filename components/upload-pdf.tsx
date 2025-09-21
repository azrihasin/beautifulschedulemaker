/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';

export default function PDFUploader({ setCourses, setIsLoading }: any) {
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoadingLocal] = useState<boolean>(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingLocal(true); // Use local loading state
    setIsLoading(true); // Update parent loading state

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload PDF');
      }

      const result = await response.json();
      console.log(result)
      setCourses(result.data || []); // Pass the extracted courses to the parent
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setText('Failed to process PDF');
    } finally {
      setIsLoadingLocal(false); // Reset local loading state
      setIsLoading(false); // Reset parent loading state
    }
  };

  return (
    <div>
      <h1>Upload PDF</h1>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      {isLoading && <p>Processing PDF...</p>}
      {text && (
        <div>
          <h2>Extracted Text:</h2>
          <pre>{text}</pre>
        </div>
      )}
    </div>
  );
}