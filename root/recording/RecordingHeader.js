/*
 * @flow
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import React from 'react';

import EntityHeader from '../components/EntityHeader';
import ArtistCreditLink from '../static/scripts/common/components/ArtistCreditLink';
import TaggerIcon from '../static/scripts/common/components/TaggerIcon';

type Props = {
  +page: string,
  +recording: RecordingT,
};

const RecordingHeader = ({recording, page}: Props) => {
  const lArgs = {
    artist: <ArtistCreditLink artistCredit={recording.artistCredit} />,
  };
  return (
    <EntityHeader
      entity={recording}
      headerClass="recordingheader"
      page={page}
      preHeader={<TaggerIcon entity={recording} />}
      subHeading={recording.video ? exp.l('Video by {artist}', lArgs) : exp.l('Recording by {artist}', lArgs)}
    />
  );
};

export default RecordingHeader;
