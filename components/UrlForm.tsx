"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n";

export function UrlForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState("");
  const t = useT();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v || !/^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(v)) {
      setError(t("form.error"));
      return;
    }
    router.push(`/glow?url=${encodeURIComponent(v)}`);
  }

  return (
    <>
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-3 sm:flex-row" noValidate>
      <label htmlFor="url" className="sr-only">
        {t("form.label")}
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
        className="h-14 w-full min-w-0 rounded-control sm:flex-1 border-[1.5px] border-ink bg-sheet px-4 text-lg placeholder:text-graphite"
      />
      <button
        type="submit"
        className="h-14 rounded-control border-[1.5px] border-ink bg-ink px-7 text-lg font-semibold text-sheet hover:bg-graphite"
      >
        {t("form.button")}
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
