/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useState } from "react";
import useAxios from "axios-hooks";

import ParticipantTable from "./search/ParticipantTable";
import ManageEmployees from "./settings/ManageEmployees";
import SponsorFairAdmin from "./fair/SponsorFairAdmin";
import VisitsTable from "./visits/VisitsTable";

enum EmployerTabs {
  VisitsTable,
  SearchParticipants,
  Settings,
  SponsorFair,
}

interface Props {
  user: any;
}

const EmployerHome: React.FC<Props> = props => {
  const [{ data, loading, error }] = useAxios(`/api/company/${props.user.company.company}`);
  const [currentTab, setCurrentTab] = useState(EmployerTabs.VisitsTable);

  useEffect(() => {
    if (data && !data?.company?.hasResumeAccess) {
      setCurrentTab(EmployerTabs.SponsorFair);
    }
  }, [data]);

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  let EmployerContent: any;

  switch (currentTab) {
    case EmployerTabs.VisitsTable:
      EmployerContent = <VisitsTable />;
      break;
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
          {data.company.hasResumeAccess && (
            <>
              <li className={`${currentTab === EmployerTabs.VisitsTable && "is-active"}`}>
                <a onClick={() => setCurrentTab(EmployerTabs.VisitsTable)}>
                  <span className="icon is-small">
                    <i className="fas fa-search" aria-hidden="true" />
                  </span>
                  <span>Visit Information</span>
                </a>
              </li>
              <li className={`${currentTab === EmployerTabs.SearchParticipants && "is-active"}`}>
                <a onClick={() => setCurrentTab(EmployerTabs.SearchParticipants)}>
                  <span className="icon is-small">
                    <i className="fas fa-search" aria-hidden="true" />
                  </span>
                  <span>Search Participants</span>
                </a>
              </li>
            </>
          )}
          <li className={`${currentTab === EmployerTabs.SponsorFair && "is-active"}`}>
            <a onClick={() => setCurrentTab(EmployerTabs.SponsorFair)}>
              <span className="icon is-small">
                <i className="fas fa-sliders-h" aria-hidden="true" />
              </span>
              <span>Sponsor Fair</span>
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
        </ul>
      </nav>
      <section>{EmployerContent}</section>
    </>
  );
};

export default EmployerHome;
