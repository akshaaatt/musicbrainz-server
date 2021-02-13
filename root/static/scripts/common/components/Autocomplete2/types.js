/*
 * @flow strict
 * Copyright (C) 2019 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

export type SearchableType = $ElementType<EntityItem, 'entityType'>;

export type State<+T: EntityItem> = {
  +canChangeType?: (string) => boolean,
  +children?: React$Node,
  +containerClass?: string,
  +disabled?: boolean,
  +entityType: SearchableType,
  +highlightedItem: Item<T> | null,
  +id: string,
  +indexedSearch: boolean,
  +inputValue: string,
  +isLookupPerformed?: boolean,
  +isOpen: boolean,
  +items: $ReadOnlyArray<Item<T>>,
  +labelClass?: string,
  +page: number,
  +pendingSearch: string | null,
  +placeholder?: string,
  +selectedEntity: T | null,
  +staticItems?: $ReadOnlyArray<Item<T>>,
  +statusMessage: string,
  +width?: string,
};

export type Props<+T: EntityItem> = $ReadOnly<{
  ...State<T>,
  +dispatch: (Actions<T>) => void,
}>;

export type SearchAction = {
  +indexed?: boolean,
  +searchTerm?: string,
  +type: 'search-after-timeout',
};

/* eslint-disable flowtype/sort-keys */
export type Actions<+T: EntityItem> =
  | SearchAction
  | {
      +type: 'change-entity-type',
      +entityType: SearchableType,
    }
  | { +type: 'highlight-item', +item: Item<T> }
  | { +type: 'highlight-next-item' }
  | { +type: 'highlight-previous-item' }
  | { +type: 'noop' }
  | { +type: 'select-item', +item: Item<T> }
  | { +type: 'set-menu-visibility', +value: boolean }
  | {
      +type: 'show-results',
      +items: $ReadOnlyArray<Item<T>>,
      +page: number,
      +resultCount: number,
    }
  | { +type: 'show-lookup-error' }
  | { +type: 'show-lookup-type-error' }
  | { +type: 'show-more-results' }
  | { +type: 'show-search-error' }
  | { +type: 'stop-search' }
  | { +type: 'toggle-indexed-search' }
  | { +type: 'type-value', +value: string };

export type ActionItem<+T> = {
  +type: 'action',
  +action: Actions<T>,
  +id: number | string,
  +name: string | () => string,
  +level?: number,
  +separator?: boolean,
  +disabled?: boolean,
};

export type OptionItem<+T> = {
  +type: 'option',
  +id: number | string,
  +name: string | () => string,
  +entity: T,
  +level?: number,
  +separator?: boolean,
  +disabled?: boolean,
};

export type HeaderItem = {
  +type: 'header',
  +id: number | string,
  +name: string | () => string,
  +disabled: true,
  +separator?: boolean,
};

export type Item<+T: EntityItem> =
  | ActionItem<T>
  | OptionItem<T>
  | HeaderItem;

/* eslint-enable flowtype/sort-keys */

/*
 * This is basically CoreEntityT without UrlT (since those aren't
 * searchable), plus EditorT (which isn't a core entity, but is
 * searchable).
 */
export type EntityItem =
  | AreaT
  | ArtistT
  | EditorT
  | EventT
  | GenreT
  | InstrumentT
  | LabelT
  | LinkAttrTypeT
  | PlaceT
  | RecordingT
  | ReleaseGroupT
  | ReleaseT
  | SeriesT
  | WorkT;
