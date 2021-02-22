/*
 * @flow
 * Copyright (C) 2019 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import * as React from 'react';

import ENTITIES from '../../../../../entities';
import {MBID_REGEXP} from '../constants';
import useOutsideClickEffect from '../hooks/useOutsideClickEffect';
import clean from '../utility/clean';

import {
  HIDE_MENU,
  HIGHLIGHT_NEXT_ITEM,
  HIGHLIGHT_PREVIOUS_ITEM,
  SHOW_LOOKUP_ERROR,
  SHOW_LOOKUP_TYPE_ERROR,
  SHOW_MENU,
  SHOW_SEARCH_ERROR,
  STOP_SEARCH,
} from './Autocomplete2/actions';
import {
  ARIA_LIVE_STYLE,
  DISPLAY_NONE_STYLE,
  EMPTY_ARRAY,
  SEARCH_PLACEHOLDERS,
} from './Autocomplete2/constants';
import formatItem from './Autocomplete2/formatters';
import {getOrFetchRecentItems} from './Autocomplete2/recentItems';
import type {
  Actions,
  EntityItem,
  Item,
  OptionItem,
  Props,
  State,
} from './Autocomplete2/types';

/*
 * `doSearch` performs a direct or indexed search (via /ws/js). This is the
 * default behavior if no `items` prop is given.
 */
function doSearch<T: EntityItem>(
  dispatch: (Actions<T>) => void,
  props: Props<T>,
  xhr: {current: XMLHttpRequest | null},
) {
  const searchXhr = new XMLHttpRequest();
  xhr.current = searchXhr;

  searchXhr.addEventListener('load', () => {
    xhr.current = null;

    if (searchXhr.status !== 200) {
      dispatch(SHOW_SEARCH_ERROR);
      return;
    }

    const entities = JSON.parse(searchXhr.responseText);
    const pager = entities.pop();
    const newPage = parseInt(pager.current, 10);
    const totalPages = parseInt(pager.pages, 10);

    dispatch({
      entities,
      page: newPage,
      totalPages,
      type: 'show-ws-results',
    });
  });

  const url = (
    '/ws/js/' + ENTITIES[props.entityType].url +
    '/?q=' + encodeURIComponent(props.inputValue || '') +
    '&page=' + String(props.page) +
    '&direct=' + (props.indexedSearch ? 'false' : 'true')
  );

  searchXhr.open('GET', url);
  searchXhr.send();
}

function handleItemMouseDown(event) {
  event.preventDefault();
}

function setScrollPosition(menuId: string) {
  const menu = document.getElementById(menuId);
  if (!menu) {
    return;
  }
  const selectedItem = menu.querySelector('li[aria-selected=true]');
  if (!selectedItem) {
    return;
  }
  const position =
    (selectedItem.offsetTop + (selectedItem.offsetHeight / 2)) -
    menu.scrollTop;
  const middle = menu.offsetHeight / 2;
  if (position < middle) {
    menu.scrollTop -= (middle - position);
  }
  if (position > middle) {
    menu.scrollTop += (position - middle);
  }
}

type InitialPropsT<T: EntityItem> = {
  +canChangeType?: (string) => boolean,
  +entityType: $ElementType<T, 'entityType'>,
  +id: string,
  +inputValue?: string,
  +placeholder?: string,
  +recentItemsKey?: string,
  +selectedEntity?: T | null,
  +staticItems?: $ReadOnlyArray<Item<T>>,
  +staticItemsFilter?: (Item<T>, string) => boolean,
  +width?: string,
};

export function createInitialState<+T: EntityItem>(
  props: InitialPropsT<T>,
): {...State<T>} {
  const {
    entityType,
    inputValue,
    recentItemsKey,
    selectedEntity,
    ...restProps
  } = props;
  return {
    entityType,
    highlightedItem: null,
    indexedSearch: true,
    inputValue: inputValue ?? selectedEntity?.name ?? '',
    isOpen: false,
    items: EMPTY_ARRAY,
    page: 1,
    pendingSearch: null,
    recentItemsKey: recentItemsKey ?? entityType,
    selectedEntity: selectedEntity ?? null,
    statusMessage: '',
    ...restProps,
  };
}

type AutocompleteItemProps<T: EntityItem> = {
  autocompleteId: string,
  dispatch: (Actions<T>) => void,
  isHighlighted: boolean,
  isSelected: boolean,
  item: Item<T>,
  selectItem: (Item<T>) => void,
};

const AutocompleteItem = React.memo(<+T: EntityItem>({
  autocompleteId,
  dispatch,
  isHighlighted,
  isSelected,
  item,
  selectItem,
}: AutocompleteItemProps<T>) => {
  const itemId = `${autocompleteId}-item-${item.id}`;
  const isDisabled = !!item.disabled;
  const isSeparator = !!item.separator;

  /*
   * `item.level` allows showing a hierarchy by indenting each option.
   * The first level (with normal padding) is 0. Each level increment
   * adds 8px to the left padding.
   */
  if (__DEV__) {
    invariant(item.level == null || item.level >= 0);
  }

  let style = (item.level && item.level > 0)
    ? {paddingLeft: String(4 + (item.level * 8)) + 'px'}
    : null;

  if (item.action) {
    style = {textAlign: 'center'};
  }

  function handleItemClick() {
    if (!item.disabled) {
      selectItem(item);
    }
  }

  function handleItemMouseOver() {
    if (!item.disabled) {
      dispatch({item, type: 'highlight-item'});
    }
  }

  return (
    <li
      aria-disabled={isDisabled ? 'true' : 'false'}
      aria-selected={isHighlighted ? 'true' : 'false'}
      className={
        (isDisabled ? 'disabled ' : '') +
        (isHighlighted ? 'highlighted ' : '') +
        (isSelected ? 'selected ' : '') +
        (isSeparator ? 'separator ' : '') +
        `${item.type}-item `
      }
      id={itemId}
      key={item.id}
      onClick={handleItemClick}
      onMouseDown={handleItemMouseDown}
      onMouseOver={handleItemMouseOver}
      role="option"
      style={style}
    >
      {formatItem<T>(item)}
    </li>
  );
});

type AutocompleteItemsProps<T: EntityItem> = {
  autocompleteId: string,
  dispatch: (Actions<T>) => void,
  highlightedItem: Item<T> | null,
  items: $ReadOnlyArray<Item<T>>,
  selectedEntity: T | null,
  selectItem: (Item<T>) => void,
};

type AutocompleteItemComponent<T> =
  React$AbstractComponent<AutocompleteItemProps<T>, void>;

function AutocompleteItems<T: EntityItem>({
  autocompleteId,
  dispatch,
  highlightedItem,
  items,
  selectedEntity,
  selectItem,
}: AutocompleteItemsProps<T>):
  $ReadOnlyArray<React.Element<AutocompleteItemComponent<T>>> {
  // XXX Until Flow supports https://github.com/facebook/flow/issues/7672
  const AutocompleteItemWithType: AutocompleteItemComponent<T> =
    (AutocompleteItem: any);

  const children = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    children.push(
      <AutocompleteItemWithType
        autocompleteId={autocompleteId}
        dispatch={dispatch}
        isHighlighted={!!(highlightedItem && item.id === highlightedItem.id)}
        isSelected={!!(
          selectedEntity &&
          item.type === 'option' &&
          item.entity.id === selectedEntity.id
        )}
        item={item}
        key={item.id}
        selectItem={selectItem}
      />,
    );
  }
  return children;
}

export default function Autocomplete2<+T: EntityItem>(
  props: Props<T>,
): React.Element<'div'> {
  const {
    canChangeType,
    containerClass,
    disabled,
    dispatch,
    entityType,
    highlightedItem,
    id,
    inputValue,
    isOpen,
    items,
    pendingSearch,
    selectedEntity,
    staticItems,
  } = props;

  const xhr = React.useRef<XMLHttpRequest | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const inputTimeout = React.useRef<TimeoutID | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const shouldUpdateScrollPositionRef = React.useRef<boolean>(false);
  const recentItemsRef =
    React.useRef<$ReadOnlyArray<OptionItem<T>> | null>(null);

  const stopRequests = React.useCallback(() => {
    if (xhr.current) {
      xhr.current.abort();
      xhr.current = null;
    }

    if (inputTimeout.current) {
      clearTimeout(inputTimeout.current);
      inputTimeout.current = null;
    }

    dispatch(STOP_SEARCH);
  }, [dispatch]);

  const selectItem = React.useCallback((item) => {
    if (!item.disabled) {
      stopRequests();
      dispatch({item, type: 'select-item'});
    }
  }, [stopRequests, dispatch]);

  function handleButtonClick(
    event: SyntheticMouseEvent<HTMLButtonElement>,
  ) {
    event.currentTarget.focus();

    stopRequests();

    if (isOpen) {
      dispatch(HIDE_MENU);
    } else {
      showAvailableItems(inputValue);
    }
  }

  function handleBlur() {
    if (isOpen) {
      setTimeout(() => {
        const container = containerRef.current;
        if (container && !container.contains(document.activeElement)) {
          stopRequests();
          dispatch(HIDE_MENU);
        }
      }, 1);
    }
  }

  function handleInputChange(
    event: SyntheticKeyboardEvent<HTMLInputElement>,
  ) {
    const newInputValue = event.currentTarget.value;
    const newCleanInputValue = clean(newInputValue);

    dispatch({type: 'type-value', value: newInputValue});

    if (!newInputValue) {
      stopRequests();
      showAvailableItems('');
      return;
    }

    const mbidMatch = newCleanInputValue.match(MBID_REGEXP);
    if (mbidMatch) {
      /*
       * The user pasted an MBID (or a URL containing one). Perform a
       * direct lookup.
       */
      stopRequests();

      if (staticItems) {
        const option = staticItems.find((item) => (
          item.type === 'option' &&
          hasOwnProp(item.entity, 'gid') &&
          // $FlowIgnore[prop-missing]
          item.entity.gid === mbidMatch[0]
        ));
        if (option) {
          selectItem(option);
        }
        return;
      }

      const lookupXhr = new XMLHttpRequest();
      xhr.current = lookupXhr;

      lookupXhr.addEventListener('load', () => {
        xhr.current = null;

        if (lookupXhr.status !== 200) {
          dispatch(SHOW_LOOKUP_ERROR);
          return;
        }

        const entity = JSON.parse(lookupXhr.responseText);
        const option: OptionItem<T> = {
          entity,
          id: entity.id,
          name: entity.name,
          type: 'option',
        };

        if (entity.entityType === entityType) {
          selectItem(option);
        } else if (canChangeType && canChangeType(entity.entityType)) {
          dispatch({
            entityType: entity.entityType,
            type: 'change-entity-type',
          });
          selectItem(option);
        } else {
          dispatch(SHOW_LOOKUP_TYPE_ERROR);
        }
      });

      lookupXhr.open('GET', '/ws/js/entity/' + mbidMatch[0]);
      lookupXhr.send();
    } else if (clean(inputValue) !== newCleanInputValue) {
      stopRequests();
      dispatch({
        searchTerm: newCleanInputValue,
        type: 'search-after-timeout',
      });
    }
  }

  function handleInputFocus() {
    showAvailableItems(inputValue);
  }

  function showAvailableItems(newInputValue: string) {
    const cleanInputValue = clean(newInputValue);

    if (
      inputTimeout.current ||
      xhr.current
    ) {
      return;
    } else if (
      items.length > 0 &&
      cleanInputValue === clean(inputValue)
    ) {
      dispatch(SHOW_MENU);
    } else if (nonEmpty(cleanInputValue)) {
      if (staticItems) {
        dispatch({
          searchTerm: newInputValue,
          type: 'filter-static-items',
        });
      } else {
        dispatch({
          searchTerm: newInputValue,
          type: 'search-after-timeout',
        });
      }
    } else {
      const recentItems = recentItemsRef.current;
      if (staticItems) {
        dispatch({
          recentItems,
          searchTerm: newInputValue,
          type: 'filter-static-items',
        });
      } else if (recentItems?.length) {
        dispatch({
          items: recentItems,
          type: 'show-recent-items',
        });
      } else {
        dispatch({type: 'reset-menu'});
      }
    }
  }

  function handleInputKeyDown(
    event: SyntheticKeyboardEvent<HTMLInputElement | HTMLButtonElement>,
  ) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();

        if (isOpen) {
          shouldUpdateScrollPositionRef.current = true;
          dispatch(HIGHLIGHT_NEXT_ITEM);
        } else {
          showAvailableItems(inputValue);
        }
        break;

      case 'ArrowUp':
        if (isOpen) {
          event.preventDefault();
          shouldUpdateScrollPositionRef.current = true;
          dispatch(HIGHLIGHT_PREVIOUS_ITEM);
        }
        break;

      case 'Enter': {
        if (isOpen) {
          event.preventDefault();
          if (highlightedItem) {
            selectItem(highlightedItem);
          }
        }
        break;
      }

      case 'Escape':
        stopRequests();
        if (isOpen) {
          event.preventDefault();
          dispatch(HIDE_MENU);
        }
        break;
    }
  }

  const handleOuterClick = React.useCallback(() => {
    stopRequests();
    if (isOpen) {
      dispatch(HIDE_MENU);
    }
  }, [stopRequests, isOpen, dispatch]);

  const activeDescendant = highlightedItem
    ? `${id}-item-${highlightedItem.id}`
    : null;
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const menuId = `${id}-menu`;
  const statusId = `${id}-status`;

  useOutsideClickEffect(
    containerRef,
    handleOuterClick,
  );

  React.useEffect(() => {
    if (shouldUpdateScrollPositionRef.current) {
      setScrollPosition(menuId);
      shouldUpdateScrollPositionRef.current = false;
    }

    if (!recentItemsRef.current) {
      getOrFetchRecentItems<T>(
        entityType,
        props.recentItemsKey,
      ).then((loadedRecentItems) => {
        recentItemsRef.current = loadedRecentItems;
      });
    }

    if (
      pendingSearch &&
      !inputTimeout.current &&
      !xhr.current
    ) {
      /*
       * Use a smaller delay for static lists, since no network
       * requests are needed in that case; updates are fast.
       */
      const delay = staticItems ? 75 : 300;

      inputTimeout.current = setTimeout(() => {
        inputTimeout.current = null;

        const pendingSearchTerm = clean(pendingSearch);
        // Check if the input value has changed before proceeding.
        if (pendingSearchTerm === clean(inputValue)) {
          if (staticItems) {
            dispatch({
              searchTerm: pendingSearchTerm,
              type: 'filter-static-items',
            });
          } else if (nonEmpty(pendingSearchTerm)) {
            doSearch<T>(dispatch, props, xhr);
          }
        }
      }, delay);
    }
  });

  // XXX Until Flow supports https://github.com/facebook/flow/issues/7672
  const AutocompleteItemsWithType:
    React$AbstractComponent<AutocompleteItemsProps<T>, void> =
    (AutocompleteItems: any);

  return (
    <div
      className={
        'autocomplete2' + (containerClass ? ' ' + containerClass : '')}
      onBlur={handleBlur}
      ref={node => {
        containerRef.current = node;
      }}
      style={props.width ? {width: props.width} : null}
    >
      <label
        className={props.labelClass}
        htmlFor={inputId}
        id={labelId}
        style={DISPLAY_NONE_STYLE}
      >
        {props.placeholder || SEARCH_PLACEHOLDERS[entityType]()}
      </label>
      <div
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="listbox"
        aria-owns={menuId}
        role="combobox"
      >
        <input
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={menuId}
          aria-labelledby={labelId}
          autoComplete="off"
          className={
            (
              props.isLookupPerformed == null
                ? selectedEntity
                : props.isLookupPerformed
            )
              ? 'lookup-performed'
              : ''}
          disabled={disabled}
          id={inputId}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={
            props.placeholder || l('Type to search, or paste an MBID')
          }
          ref={inputRef}
          value={inputValue}
        />
        <button
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls={menuId}
          aria-haspopup="true"
          aria-label={l('Search')}
          className={
            'search' +
            ((
              pendingSearch &&
              !disabled &&
              /*
               * Lookups for static item lists complete near-instantly,
               * so flashing a loading spinner is obnoxious.
               */
              !staticItems
            ) ? ' loading' : '')
          }
          data-toggle="true"
          disabled={disabled}
          onClick={handleButtonClick}
          onKeyDown={handleInputKeyDown}
          role="button"
          title={l('Search')}
          type="button"
        />
        {props.children}
      </div>

      <ul
        aria-controls={statusId}
        aria-labelledby={labelId}
        id={menuId}
        role="listbox"
        style={{
          visibility: (isOpen && !disabled)
            ? 'visible'
            : 'hidden',
        }}
      >
        {disabled ? null : (
          <AutocompleteItemsWithType
            autocompleteId={id}
            dispatch={dispatch}
            highlightedItem={highlightedItem}
            items={items}
            selectItem={selectItem}
            selectedEntity={selectedEntity}
          />
        )}
      </ul>

      <div
        aria-live="assertive"
        aria-relevant="additions text"
        id={statusId}
        role="status"
        style={ARIA_LIVE_STYLE}
      >
        {props.statusMessage}
      </div>
    </div>
  );
}
