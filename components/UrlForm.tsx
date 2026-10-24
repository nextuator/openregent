"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UrlForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v || !/^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(v)) {
      setError("Paste a website address, like baeckerei-example.ch.");
      return;
    }
    router.push(`/glow?url=${encodeURIComponent(v)}`);
  }

  return (
    <>
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-3 sm:flex-row" noValidate>
      <label htmlFor="url" className="sr-only">
        Website address
      </label>
      <input
        id="url"
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setError("");
        }}
        aria-describedby={error ? "url-error" : undefined}
        className="h-14 flex-1 rounded-control border-[1.5px] border-ink bg-sheet px-4 text-lg placeholder:text-graphite"
      />
      <button
        type="submit"
        className="h-14 rounded-control border-[1.5px] border-ink bg-ink px-7 text-lg font-semibold text-sheet hover:bg-graphite"
      >
        Glow it up
      </button>
    </form>
      {error && (
        <p id="url-error" className="mt-2 text-redline">
          {error}
        </p>
      )}
    </>
  );
}
