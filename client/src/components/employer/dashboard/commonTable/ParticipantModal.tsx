import React, { useEffect, useState } from "react";
import { apiUrl, LoadingScreen, Service, useAuth } from "@hex-labs/core";
import {
  Box,
  Button,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Stack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import useAxios from "axios-hooks";

interface Props {
  companyHasAccess: boolean;
  participantId: string;
  setModalUser: React.Dispatch<any>;
}

const ParticipantModal: React.FC<Props> = props => {
  const [link, setLink] = useState({
    url: "",
    withCredentials: false,
  });

  const [{ data, loading, error }, userRefetch] = useAxios({
    method: "GET",
    url: apiUrl(Service.REGISTRATION, `/applications/${props.participantId}`),
  });

  if (props.participantId === "" || loading || error) {
    return <LoadingScreen />;
  }

  return props.participantId !== "" ? (
    <Modal isOpen onClose={() => props.setModalUser("")} isCentered size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{data.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box>
            <Accordion defaultIndex={[0, 1, 2, 3]} allowMultiple>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Text style={{ fontWeight: "bold" }}>Contact Information</Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={3}>
                  <Stack>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        Email
                      </Text>
                      {data.email}
                    </Text>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        Phone Number
                      </Text>
                      {data.applicationData.phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")}
                    </Text>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        School Email
                      </Text>
                      {data.applicationData.schoolEmail}
                    </Text>
                  </Stack>
                </AccordionPanel>
              </AccordionItem>

              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <Text style={{ fontWeight: "bold" }}>General Information</Text>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Stack>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        University
                      </Text>
                      {data.applicationData.school}
                    </Text>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        School Year
                      </Text>
                      {data.applicationData.schoolYear}
                    </Text>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        Major
                      </Text>
                      {data.applicationData.major}
                    </Text>

                    <Text>
                      <Text color="gray" fontSize="sm">
                        Identifies as
                      </Text>
                      {data.applicationData.gender}
                    </Text>
                    <Text>
                      <Text color="gray" fontSize="sm">
                        Ethnicity
                      </Text>
                      {data.applicationData.ethnicity}
                    </Text>
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
          <footer className="modal-card-foot" style={{ backgroundColor: "white" }}>
            <Button
              onClick={() => {
                window
                  .open(
                    apiUrl(
                      Service.FILES,
                      `/files/${data.applicationData.resume?.id}/view?hexathon=${process.env.REACT_APP_HEXATHON_ID}`
                    ),
                    "_blank"
                  )
                  ?.focus();
              }}
              type="button"
              className="button is-info"
              disabled={!data.applicationData.resume?.id || !props.companyHasAccess}
            >
              <span className="icon is-small">
                <i className="fas fa-download" />
              </span>
              <span>Download Resume</span>
            </Button>
          </footer>
        </ModalBody>
      </ModalContent>
    </Modal>
  ) : null;
};

export default ParticipantModal;
