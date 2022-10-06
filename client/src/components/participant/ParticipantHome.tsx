/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState } from "react";
import useAxios from "axios-hooks";
import { Navigate } from "react-router-dom";

import { formatName } from "../../util";
import SponsorInformation from "./SponsorInformation";
import ParticipantInfo from "./ParticipantInfo";
import SponsorFair from "./SponsorFair";

interface Props {
  user: any;
}

enum ParticipantTabs {
  ParticipantInformationTab,
  SponsorInformationTab,
  SponsorFairTab,
}

const ParticipantHome: React.FC<Props> = props => {
  const [{ data, loading, error }] = useAxios("/api/participant");
  const [currentTab, setCurrentTab] = useState(ParticipantTabs.ParticipantInformationTab);

  let ParticipantContent: React.ReactElement;

  switch (currentTab) {
    case ParticipantTabs.ParticipantInformationTab:
      ParticipantContent = <ParticipantInfo user={props.user} />;
      break;
    case ParticipantTabs.SponsorInformationTab:
      ParticipantContent = <SponsorInformation />;
      break;
    case ParticipantTabs.SponsorFairTab:
      ParticipantContent = <SponsorFair user={props.user} />;
      break;
  }

  if (props.user.type !== "participant" && !props.user.admin) {
    return <Navigate to="/" />;
  }

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  if (!data) {
    return (
      <h2 className="subtitle" style={{ textAlign: "center" }}>
        Hello, your participant data has not been processed yet. Please check back in approximately
        30 min.
      </h2>
    );
  }

  return (
    <>
      <nav className="tabs is-fullwidth">
        <ul>
          <li
            className={`${currentTab === ParticipantTabs.ParticipantInformationTab && "is-active"}`}
          >
            <a onClick={() => setCurrentTab(ParticipantTabs.ParticipantInformationTab)}>
              <span className="icon is-small">
                <i className="fas fa-search" aria-hidden="true" />
              </span>
              <span>My Info</span>
            </a>
          </li>
          <li className={`${currentTab === ParticipantTabs.SponsorInformationTab && "is-active"}`}>
            <a onClick={() => setCurrentTab(ParticipantTabs.SponsorInformationTab)}>
              <span className="icon is-small">
                <i className="fas fa-sliders-h" aria-hidden="true" />
              </span>
              <span>Sponsor Information</span>
            </a>
          </li>
          <li className={`${currentTab === ParticipantTabs.SponsorFairTab && "is-active"}`}>
            <a onClick={() => setCurrentTab(ParticipantTabs.SponsorFairTab)}>
              <span className="icon is-small">
                <i className="fas fa-sliders-h" aria-hidden="true" />
              </span>
              <span>Sponsor Fair</span>
            </a>
          </li>
        </ul>
      </nav>
      <section>{ParticipantContent}</section>
      <section>
        <SponsorInformation />
      </section>
      <section>
        <SponsorFair user={props.user} />
      </section>
    </>
  );
};

export default ParticipantHome;
