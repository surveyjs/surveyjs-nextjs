// Demo only: the catalog header. The SurveyJS logo, linking to surveyjs.io, and the app title. The logo's tail
// (the bottom quarter of each image) hangs below the row, so the title and the divider centre on the logo's box.
export function SiteHeader({ header }: { header: string }) {
  return (
    <header className="border-b border-sjs-line bg-white">
      <div className="flex items-center gap-4 px-4 pt-4 pb-5 md:gap-5 md:px-6 md:pb-6 xl:px-8">
        <a href="https://surveyjs.io" className="shrink-0" target="_blank">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shared/ui/images/logo-small.svg" width="78.1377" height="32" alt="SurveyJS" className="-mb-2 block md:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shared/ui/images/logo-medium.svg" width="122.09" height="50" alt="SurveyJS" className="-mb-3 hidden md:block" />
        </a>
        <span aria-hidden="true" className="block h-6 w-px shrink-0 bg-sjs-line md:h-[38px]"></span>
        <p className="m-0 text-base/5 font-bold text-sjs-fg md:text-xl/7 xl:text-2xl/8">{header}</p>
      </div>
    </header>
  );
}
