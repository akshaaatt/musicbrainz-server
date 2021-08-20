/*
 * @flow strict
 * Copyright (C) 2020 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

const FaviconLinks = (): React.Element<typeof React.Fragment> => (
  <>

      <link rel="apple-touch-icon" sizes="180x180" href="/root/apple-touch-icon.png">
          <link rel="icon" type="image/png" sizes="32x32" href="/root/favicon-32x32.png">
              <link rel="icon" type="image/png" sizes="16x16" href="/root/favicon-16x16.png">
                  <link rel="manifest" href="/root/site.webmanifest">

    <link href="/root/favicon.ico" rel="shortcut icon" />
    <meta content="#f1f1f1" name="msapplication-TileColor" />
    <meta
      content="/static/images/favicons/mstile-144x144.png"
      name="msapplication-TileImage"
    />
    <meta content="#ffffff" name="theme-color" />
  </>
);

export default FaviconLinks;
