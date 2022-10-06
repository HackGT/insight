import React, { useState } from "react";
import useAxios from "axios-hooks";
// import Editor from "rich-markdown-editor";

import SponsorSquare from "./CompanySquare";

const SponsorInformation: React.FC = () => {
  const [{ data, loading, error }] = useAxios("/api/company");
  const [activeSponsor, setActiveSponsor] = useState<any>({});
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  if (loading) {
    return <div>Loading</div>;
  }

  if (error) {
    return <div>Error</div>;
  }

  console.log(data);

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
        {data.companies.map((company: any) => (
          <SponsorSquare company={company} openModal={openModal} />
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
            {/* {activeSponsor?.description && <Editor value={activeSponsor.description} readOnly />} */}
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
