import svgPaths from "./svg-d29d82xyuv";

function LeftSection() {
  return (
    <div className="box-border content-stretch flex gap-2.5 h-full items-center justify-center overflow-clip pl-2 pr-16 py-0 relative shrink-0" data-name="left section">
      <div className="css-45vvdv flex flex-col font-['IBM_Plex_Sans:Medium',_sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#1a1a1a] text-[25px] text-nowrap tracking-[-0.25px]">
        <p className="leading-[33px] whitespace-pre">Cases</p>
      </div>
    </div>
  );
}

function QuestionFill() {
  return (
    <div className="relative shrink-0 size-6" data-name="question-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="question-fill">
          <path d={svgPaths.p36268b00} fill="var(--fill-0, #36393D)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function MailFill() {
  return (
    <div className="relative shrink-0 size-6" data-name="mail-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="mail-fill">
          <path d={svgPaths.p19c51c70} fill="var(--fill-0, #36393D)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Theme() {
  return (
    <div className="relative shrink-0 size-5" data-name="theme">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="theme">
          <path d={svgPaths.p2f5b3800} fill="var(--fill-0, #36393D)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="content-stretch flex h-6 items-center justify-center min-h-10 min-w-10 relative rounded-[4px] shrink-0" data-name="button">
      <Theme />
    </div>
  );
}

function ButtonIconMode() {
  return (
    <div className="content-stretch flex items-start justify-start relative shrink-0 w-6" data-name="Button - IconMode">
      <Button2 />
    </div>
  );
}

function UtilityIcons() {
  return (
    <div className="content-stretch flex gap-4 items-center justify-end relative shrink-0" data-name="utility-icons">
      <QuestionFill />
      <MailFill />
      <ButtonIconMode />
    </div>
  );
}

function RightSection() {
  return (
    <div className="box-border content-stretch flex gap-6 h-full items-center justify-end pl-16 pr-0 py-0 relative shrink-0" data-name="right section">
      <UtilityIcons />
    </div>
  );
}

export default function Utility() {
  return (
    <div className="bg-[#f9f9f7] relative size-full" data-name="utility">
      <div className="flex flex-row items-center min-w-inherit relative size-full">
        <div className="box-border content-stretch flex items-center justify-between min-w-inherit px-6 py-0 relative size-full">
          <LeftSection />
          <RightSection />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-[rgba(54,57,61,0.08)] border-solid inset-0 pointer-events-none" />
    </div>
  );
}