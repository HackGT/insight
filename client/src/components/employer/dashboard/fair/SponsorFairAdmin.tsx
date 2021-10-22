/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useEffect, useState } from "react";
import parse from "html-react-parser";
import DailyWindow from "../../../video/DailyWindow";

// import { fetchSponsors } from "../../util/cms";
// import SponsorSquare from "./SponsorSquare";

interface EventInformation {
  id: string;
  url: string;
  title: string;
  tags: string[];
  description: string;
}

const callData = [
  {
    company: "NCR",
    calls: [
      {
        id: "1",
        title: "NCR Call 1",
        url: "https://testingtesting123.daily.co/7FEknXCZzS9R8laG8JIH",
        tags: [],
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
      {
        id: "2",
        title: "NCR Call 2",
        url: "https://testingtesting123.daily.co/7FEknXCZzS9R8laG8JIH",
        tags: [],
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
    ],
  },
];

const SponsorFair: React.FC = () => {
  const [sponsorCall, setSponsorCall] = useState<EventInformation>({
    id: "0",
    url: "",
    title: "",
    tags: [],
    description: "",
  });
  //   const [sponsorCallsLoaded, setSponsorCallsLoaded] = useState(false);

  const callMenu = callData.map(sponsor => {
    const callItems = sponsor.calls.map(call => (
      <li>
        <a
          onClick={() => {
            setSponsorCall(call);
          }}
          className={sponsorCall.id === call.id ? "is-active" : ""}
        >
          {call.title}
        </a>
      </li>
    ));
    return (
      <>
        <p className="menu-label">{sponsor.company}</p>
        <ul className="menu-list">{callItems}</ul>
      </>
    );
  });
  return (
    <div className="columns">
      <div className="column">
        <aside className="menu">{callMenu}</aside>
      </div>
      <div className="column is-three-quarters">
        {sponsorCall.url && <DailyWindow videoID={sponsorCall.url} event={sponsorCall} />}
        <h1 className="title">{sponsorCall.title}</h1>
        <p>{sponsorCall.description}</p>
      </div>
    </div>
  );
};

export default SponsorFair;
