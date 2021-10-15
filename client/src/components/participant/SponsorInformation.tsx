import React, { useEffect, useState } from "react";
import parse from "html-react-parser";

import { fetchSponsors } from "../../util/cms";
import SponsorSquare from "./SponsorSquare";

const SponsorInformation: React.FC = () => {
  const [sponsors, setSponsors] = useState<any>([]);
  const [activeSponsor, setActiveSponsor] = useState<any>({});
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function getSponsors() {
      const fetchedSponsors = await fetchSponsors();
      setSponsors(fetchedSponsors);
    }

    getSponsors();
  }, []);

  const openModal = (sponsor: any) => {
    setActiveSponsor(sponsor);
    setModalOpen(true);
  };

  const closeModal = () => {
    setActiveSponsor({});
    setModalOpen(false);
  };

  return (
    <>
      <div id="sponsor-content">
        {sponsors.map((sponsor: any) => (
          <SponsorSquare sponsor={sponsor} openModal={openModal} />
        ))}
      </div>
      <article className={`modal ${modalOpen ? "is-active" : ""}`}>
        <div className="modal-background" />
        <div className="modal-card">
          <header className="modal-card-head">
            <div className="modal-title">
              <h1 className="title" id="sponsor-name">
                {activeSponsor.name}
              </h1>
            </div>
            <button className="delete" aria-label="close" onClick={() => closeModal()} />
          </header>
          <section className="modal-card-body">
            <div>
              <div className="">
                <b>About: </b>
                <p id="company-about">{parse(activeSponsor.about || "")}</p>
              </div>
              <div className="">
                <b>Website: </b>
                <a
                  id="company-website"
                  target="_blank"
                  rel="noreferrer"
                  href={activeSponsor.website}
                >
                  {activeSponsor.website}
                </a>
              </div>
              <div className="">
                <b>Event Information: </b>
                <p id="company-eventInformation">{parse(activeSponsor.eventInformation || "")}</p>
              </div>
              <div className="">
                <b>Challenge Information: </b>
                <p id="company-challengeInformation">
                  {parse(activeSponsor.challengeInformation || "")}
                </p>
              </div>
              <div className="">
                <b>Recruiting: </b>
                <p id="company-recruiting">{parse(activeSponsor.recruiting || "")}</p>
              </div>
              <div className="">
                <b>Additional Info: </b>
                <p id="company-additionalInfo">{parse(activeSponsor.additionalInfo || "")}</p>
              </div>
              <button className="button">
                <a
                  id="company-participantLink"
                  target="_blank"
                  rel="noreferrer"
                  href={activeSponsor.blueJeansLink}
                >
                  Join Call as Participant
                </a>
              </button>
            </div>
          </section>
          <footer className="modal-card-foot">
            <div className="buttons">
              <button className="button" id="detail-close" onClick={() => closeModal()}>
                Close
              </button>
            </div>
          </footer>
        </div>
      </article>
    </>
  );
};

export default SponsorInformation;
