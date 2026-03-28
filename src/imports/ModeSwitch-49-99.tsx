function ModeGlyph() {
  return (
    <div className="content-stretch flex gap-1 items-center justify-start relative shrink-0" data-name="Mode Glyph">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none scale-y-[-100%]">
          <div className="bg-[#fec62e] h-2 rounded-[8px] w-3.5" data-name="1st Dot" />
        </div>
      </div>
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none scale-y-[-100%]">
          <div className="bg-[rgba(54,57,61,0.25)] rounded-[8px] size-1.5" data-name="2nd Dot" />
        </div>
      </div>
    </div>
  );
}

export default function ModeSwitch() {
  return (
    <div className="relative size-full" data-name=".Mode Switch">
      <div className="flex flex-col justify-center relative size-full">
        <div className="box-border content-stretch flex flex-col gap-1 items-start justify-center p-[20px] relative size-full">
          <ModeGlyph />
        </div>
      </div>
    </div>
  );
}