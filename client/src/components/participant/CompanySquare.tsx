/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from "react";

interface Props {
  company: any;
  openModal: (sponsor: any) => void;
}

const CompanySquare: React.FC<Props> = props => (
  <div className="button sponsor" onClick={() => props.openModal(props.company)}>
    <p>{props.company.name}</p>
  </div>
);

export default CompanySquare;
