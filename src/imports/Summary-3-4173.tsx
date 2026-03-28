import svgPaths from "./svg-o0uqoao5g9";

function Left() {
  return (
    <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0" data-name="Left">
      <div className="css-14djnx font-['IBM_Plex_Sans:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[25px] text-nowrap tracking-[-0.25px]">
        <p className="leading-[33px] whitespace-pre">20-08-1847</p>
      </div>
    </div>
  );
}

function Avatar2() {
  return (
    <div className="bg-[#2e5e18] box-border content-stretch flex items-center justify-center mr-[-4px] relative rounded-[99px] shrink-0 size-10" data-name="Avatar 2">
      <div className="css-faof2p flex flex-col font-['IBM_Plex_Sans:Regular',_sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[16px] text-center text-nowrap text-white">
        <p className="leading-[22px] whitespace-pre">TG</p>
      </div>
    </div>
  );
}

function AccessControl() {
  return (
    <div className="basis-0 box-border content-stretch flex grow items-center justify-end min-h-px min-w-px pl-0 pr-1 py-0 relative shrink-0" data-name="Access Control">
      <Avatar2 />
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#165a8a] box-border content-stretch flex gap-2 h-10 items-center justify-center px-4 py-0 relative rounded-[4px] shrink-0" data-name="button">
      <div className="css-7y0vrn flex flex-col font-['IBM_Plex_Sans:SemiBold',_sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f2ece9] text-[16px] text-center text-nowrap tracking-[-0.16px]">
        <p className="leading-[22px] whitespace-pre">Share Case</p>
      </div>
    </div>
  );
}

function RecievedIcon() {
  return (
    <div className="relative shrink-0 size-6" data-name="Recieved Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Recieved Icon">
          <path d={svgPaths.p2241ba00} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Recieved() {
  return (
    <div className="bg-[#0088e9] content-stretch flex items-center justify-center relative rounded-[99px] shrink-0 size-10" data-name="Recieved">
      <RecievedIcon />
    </div>
  );
}

function Right() {
  return (
    <div className="content-stretch flex gap-2.5 items-center justify-end relative shrink-0 w-28" data-name="Right">
      <AccessControl />
      <Button />
      <Recieved />
    </div>
  );
}

function Content1() {
  return (
    <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-name="Content">
      <Left />
      <Right />
    </div>
  );
}

function Title() {
  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative shrink-0 w-full" data-name="Title">
      <div className="css-7qwgra font-['IBM_Plex_Sans:SemiBold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[13px] text-nowrap tracking-[0.5px] uppercase">
        <p className="leading-[17px] whitespace-pre">Court Number</p>
      </div>
      <Content1 />
    </div>
  );
}

function User() {
  return (
    <div className="relative shrink-0 size-4" data-name="user">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="user">
          <path d={svgPaths.p93f2280} fill="var(--fill-0, #36393D)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Accused() {
  return (
    <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0" data-name="Accused">
      <User />
      <div className="css-xljgjz font-['IBM_Plex_Sans:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[13px] text-nowrap">
        <p className="leading-[18px] whitespace-pre">Roger Sheriden</p>
      </div>
    </div>
  );
}

function PoliceCarFill() {
  return (
    <div className="relative shrink-0 size-4" data-name="police-car-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="police-car-fill">
          <path d={svgPaths.p32310800} fill="var(--fill-0, #36393D)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Id() {
  return (
    <div className="content-stretch flex gap-2 items-center justify-start relative shrink-0" data-name="ID">
      <PoliceCarFill />
      <div className="css-xljgjz font-['IBM_Plex_Sans:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[13px] text-nowrap">
        <p className="leading-[18px] whitespace-pre">20-08-1847</p>
      </div>
    </div>
  );
}

function Details() {
  return (
    <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0 w-full" data-name="Details">
      <Accused />
      <Id />
      <div className="css-xljgjz font-['IBM_Plex_Sans:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[13px] text-nowrap">
        <p className="leading-[18px] whitespace-pre">Arrested for aggravated assault</p>
      </div>
    </div>
  );
}

function Top() {
  return (
    <div className="relative rounded-[4px] shrink-0 w-full" data-name="Top">
      <div className="relative size-full">
        <div className="box-border content-stretch flex flex-col gap-4 items-start justify-start p-[8px] relative w-full">
          <Title />
          <Details />
        </div>
      </div>
    </div>
  );
}

function Badge() {
  return (
    <div className="bg-[#a01313] box-border content-stretch flex h-[18px] items-center justify-center min-w-6 overflow-clip p-[4px] relative rounded-[16px] shrink-0" data-name="badge">
      <div className="basis-0 css-ubpb2l flex flex-col font-['IBM_Plex_Sans:Regular',_sans-serif] grow justify-center leading-[0] min-h-px min-w-2.5 not-italic relative shrink-0 text-[#f2ece9] text-[13px] text-center">
        <p className="leading-[18px]">25</p>
      </div>
    </div>
  );
}

function Tab01() {
  return (
    <div className="box-border content-stretch flex gap-2 h-10 items-center justify-start px-4 py-0 relative shrink-0" data-name="Tab 01">
      <div aria-hidden="true" className="absolute border-[#165a8a] border-[0px_0px_2px] border-solid inset-0 pointer-events-none" />
      <div className="css-wfh6ml font-['IBM_Plex_Sans:Bold',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#165a8a] text-[14px] text-center text-nowrap tracking-[-0.14px]">
        <p className="leading-[normal] whitespace-pre">Evidence 25</p>
      </div>
      <Badge />
    </div>
  );
}

function TabAtom() {
  return (
    <div className="box-border content-stretch flex gap-2 h-10 items-center justify-start px-4 py-0 relative shrink-0" data-name=".tab-atom">
      <div className="css-ms4od font-['IBM_Plex_Sans:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[14px] text-center text-nowrap tracking-[-0.14px]">
        <p className="leading-[normal] whitespace-pre">Requests</p>
      </div>
    </div>
  );
}

function TabAtom1() {
  return (
    <div className="box-border content-stretch flex gap-2 h-10 items-center justify-start px-4 py-0 relative shrink-0" data-name=".tab-atom">
      <div className="css-ms4od font-['IBM_Plex_Sans:Medium',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#36393d] text-[14px] text-center text-nowrap tracking-[-0.14px]">
        <p className="leading-[normal] whitespace-pre">Workbench</p>
      </div>
    </div>
  );
}

function TabAtom2() {
  return (
    <div className="basis-0 grow h-10 min-h-px min-w-px relative shrink-0" data-name=".tab-atom">
      <div className="flex flex-row items-center relative size-full">
        <div className="box-border content-stretch flex gap-2 h-10 items-center justify-start px-4 py-0 w-full" />
      </div>
    </div>
  );
}

function Tabs() {
  return (
    <div className="content-stretch flex items-center justify-start relative shrink-0 w-full" data-name="Tabs">
      <div aria-hidden="true" className="absolute border-[0px_0px_1px] border-[rgba(54,57,61,0.25)] border-solid inset-0 pointer-events-none" />
      <Tab01 />
      <TabAtom />
      <TabAtom1 />
      <TabAtom2 />
    </div>
  );
}

export default function Summary() {
  return (
    <div className="content-stretch flex flex-col gap-2 items-start justify-start relative rounded-tl-[8px] rounded-tr-[8px] size-full" data-name="Summary">
      <Top />
      <Tabs />
    </div>
  );
}