'use client'

import dynamic from "next/dynamic";

const PdfExport = dynamic(() => import('@/components/PdfExport'), {
  ssr: false,
})

export default function PdfExportPage() {
  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="mb-12 text-3xl font-bold tracking-tight md:text-xl xl:text-2xl">SurveyJS PDF Generator</h1>
      <PdfExport />
    </div>
  );
}
