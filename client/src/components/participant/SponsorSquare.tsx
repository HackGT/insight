/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from "react";

interface Props {
  sponsor: any;
  openModal: (sponsor: any) => void;
}

const SponsorSquare: React.FC<Props> = props => (
  <div className="button sponsor" onClick={() => props.openModal(props.sponsor)}>
    <p>{props.sponsor.name}</p>
  </div>
);

export default SponsorSquare;
