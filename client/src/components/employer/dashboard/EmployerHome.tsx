/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useContext, useState } from "react";

import { SocketContext } from "../../../context/socket";
import ParticipantTable from "./search/ParticipantTable";
import ManageEmployees from "./settings/ManageEmployees";
import SponsorFairAdmin from "./fair/SponsorFairAdmin";

enum EmployerTabs {
  SearchParticipants,
  Settings,
  SponsorFair,
}

interface Props {
  user: any;
}

const EmployerHome: React.FC<Props> = props => {
  const [currentTab, setCurrentTab] = useState(EmployerTabs.SearchParticipants);

  let EmployerContent: any;

  switch (currentTab) {
    case EmployerTabs.SearchParticipants:
      EmployerContent = <ParticipantTable />;
      break;
    case EmployerTabs.Settings:
      EmployerContent = <ManageEmployees user={props.user} />;
      break;
    case EmployerTabs.SponsorFair:
      EmployerContent = <SponsorFairAdmin />;
  }

  return (
    <>
      <nav className="tabs is-fullwidth">
        <ul>
          {/* <li className="is-active" id="scanning-tab">
          <a>
            <span className="icon is-small">
              <i className="fas fa-info-circle" aria-hidden="true"></i>
            </span>
            <span>Information</span>
          </a>
        </li> */}
          <li className={`${currentTab === EmployerTabs.SearchParticipants && "is-active"}`}>
            <a onClick={() => setCurrentTab(EmployerTabs.SearchParticipants)}>
              <span className="icon is-small">
                <i className="fas fa-search" aria-hidden="true" />
              </span>
              <span>Search Participants</span>
            </a>
          </li>
          <li className={`${currentTab === EmployerTabs.Settings && "is-active"}`}>
            <a onClick={() => setCurrentTab(EmployerTabs.Settings)}>
              <span className="icon is-small">
                <i className="fas fa-sliders-h" aria-hidden="true" />
              </span>
              <span>Settings</span>
            </a>
          </li>
          <li className={`${currentTab === EmployerTabs.SponsorFair && "is-active"}`}>
            <a onClick={() => setCurrentTab(EmployerTabs.SponsorFair)}>
              <span className="icon is-small">
                <i className="fas fa-sliders-h" aria-hidden="true" />
              </span>
              <span>Sponsor Fair</span>
            </a>
          </li>
        </ul>
      </nav>
      <section>{EmployerContent}</section>
    </>
  );
};

export default EmployerHome;
