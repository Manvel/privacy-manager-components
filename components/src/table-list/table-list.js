import {registerActionListener, deepCopy} from "./utils.js";

class SettingList extends HTMLElement {
  constructor() {
    super();

    this.items = [];
    // TODO: add setSort method.
    this.sort = (a, b) => a.id.localeCompare(b.id, undefined, {numeric: true});
    this.listElem = null;
    this.listItemTemplate = null;
    this.listSubItemTemplate = null;
    this.loaded = 0;
    this.loadAmount = 50;
    this.scrollLoadPercentage = 0.8;

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .tableList,
        .tableList ul
        {
          list-style: none;
          font-size: 13px;
          overflow: auto;
          padding: 0px;
        }

        .tableList
        {
          height: 270px;
        }

        .tableList ul
        {
          padding-bottom: 10px;
        }

        .tableList li > div
        {
          display: flex;
          padding: 5px 5px;
          align-items: center;
          cursor: pointer;
        }

        .tableList li > div:hover
        {
          background-color: #cee0c2;
        }

        .tableList li[data-expanded="true"] > ul
        {
          border-top: 1px solid #324B2C;
        }

        .tableList li .data-container
        {
          flex-grow: 1;
        }

        .tableList li span
        {
          display: inline-block;
        }
        button.icon
        {
          background-color: transparent;
          border: none;
          width: 20px;
          padding: 0px;
          cursor: default;
        }
        button.icon:after
        {
          display: inline-block;
          content: "";
          width: 10px;
          height: 10px;
          margin: 0px auto;
        }
        button.icon.delete:after
        {
          background-image: url(../../../img/table-list/delete.svg);
        }
        button.icon.delete:hover:after
        {
          background-image: url(../../../img/table-list//delete-hover.svg);
        }
        button.icon.edit:after
        {
          background-image: url(../../../img/table-list//edit.svg);
        }
        button.icon.edit:hover:after
        {
          background-image: url(../../../img/table-list//edit-hover.svg);
        }
        button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark.svg);
        }
        button.icon.whitelist:hover:after
        {
          opacity: .8;
        }
        [data-whitelist="true"] button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark-active.svg);
        }
        [data-whitelist="true"] [data-whitelist="true"] button.icon.whitelist:after
        {
          background-image: url(../../../img/table-list//check-mark-double-active.svg);
        }
        .tableList .domainName
        {
          width: 300px
        }
        .tableList .cookieName
        {
          width: 280px;
        }
        .tableList .cookieValue
        {
          width: 100px;
          white-space: pre;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      </style>
      <ul class="tableList "></ul>
    `;
  }

  connectedCallback()
  {
    [this.listItemTemplate, this.listSubItemTemplate] = this.querySelectorAll("template");
    this.listElem = this.shadowRoot.querySelector("ul");
    this.listElem.addEventListener("scroll", this._onScroll.bind(this), false);

    this.listElem.addEventListener("keydown", function(ev)
    {
      // Prevent the scrollable list from scrolling
      if (ev.key == "ArrowDown" || ev.key == "ArrowUp")
      {
        ev.preventDefault();
      }
    }, false);

    registerActionListener(this, this._onAction);
  }

  /**
   * Add item and subItem to the Table list
   * @param {Array} itemObjs array of itemObj:
   * {
   *   id:       "itemId1",
   *   dataset:  {datasetname: "/"},
   *   texts:    {data-text-value: "example.com", data-text-value: "3 Cookies"}
   * }
   * @param {String} id parent item id, if skipped top level item is
   * added
   * @param {Boolean} _deepCopy uses shallow copy when false (default: true)
   */
  addItems(itemObjs, id, _deepCopy = true)
  {
    // If we don't deep copy the added items modification of the items on the
    // user side might affect actual data used for table-list
    const itemObjCopy = _deepCopy ? deepCopy(itemObjs) : itemObjs;
    const parentItem = this.getItem(id, null, false);
    if (parentItem && !parentItem.subItems)
      parentItem.subItems = [];
    const items = parentItem ? parentItem.subItems : this.items;

    items.push(...itemObjCopy);

    // TODO: Sort by item names in PM
    if (this.sort)
      items.sort(this.sort);

    for (const itemObj of itemObjCopy)
    {
      if (parentItem)
      {
        this._loadSubItem(itemObj, id);
      }
      else  // Dynamic load only top level items
      {
        const itemIndex = this.items.indexOf(itemObj);
        if (itemIndex < this.loaded || itemIndex < this.loadAmount)
          this._loadItem(itemObj);
      }
    }
  }

  /**
   * Load item into the view
   * @param  {JSON} itemObj as specified in addItems
   */
  _loadItem(itemObj)
  {
    if (!itemObj.dataset)
      itemObj.dataset = {};

    if (!itemObj.id)
      itemObj.id = this.items.indexOf(itemObj);

    const listItem = this._itemFromTmpl(itemObj, this.listItemTemplate);
    const itemIndex = this.items.indexOf(itemObj);
    const elemAfter = this.listElem.children[itemIndex];

    if (elemAfter)
      this.listElem.insertBefore(listItem, elemAfter);
    else
      this.listElem.appendChild(listItem);

    this.loaded++;
  }

  /**
   * Scroll bar event handler
   */
  _onScroll()
  {
    const listClientScrollBottom = this.listElem.scrollTop +
      this.listElem.clientHeight;
    const percentage = listClientScrollBottom / this.listElem.scrollHeight;
    if (percentage > this.scrollLoadPercentage && this.loaded < this.items.length)
    {
      const loadLimit = this.loaded + this.loadAmount;
      for (let i = this.loaded -1; i < loadLimit && i < this.items.length; i++)
      {
        this._loadItem(this.items[i]);
      }
    }
  }

  /**
   * Remove item or subItem from the list
   * @param {String} id item ID
   * @param {String} parentId Parent item id ID, used to remove
   *                                subItem if specified(optional)
   * @param {Boolean} result
   */
  removeItem(id, parentId)
  {
    const index = this.getItemIndex(id, parentId);
    if (index >= 0)
    {
      if (parentId)
      {
        this._unloadSubItem(id, parentId);
        const parentItem = this.getItem(parentId, null, false);
        parentItem.subItems.splice(index, 1);
        const hasSubitems = parentItem.subItems.length;
        if (!hasSubitems)
          delete parentItem.subItems;
      }
      else
      {
        this._unloadItem(id);
        this.items.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  /**
   * Remove item Node from the DOM
   * @param {String} id item ID 
   */
  _unloadItem(id)
  {
    const itemElem = this.getItemElem(id);
    if (!itemElem)
      return;

    if (itemElem.isSameNode(this.shadowRoot.activeElement))
      this.selectItem(id, null, "next");
    this.listElem.removeChild(itemElem);
  }

  /**
   * Remove sub item Node from the DOM
   * @param {String} id       item ID 
   * @param {String} parentId parent item id ID
   */
  _unloadSubItem(id, parentId)
  {
    const itemElem = this.getItemElem(id, parentId);
    if (!itemElem)
      return;

    const activeElement = this.shadowRoot.activeElement;
    if (activeElement.isSameNode(itemElem))
      this.selectItem(id, parentId, "next");

    const subListContainerElem = this.getItemElem(parentId);
    const subListElems = subListContainerElem.querySelector("ul");
    subListElems.removeChild(itemElem);
    if (!subListElems.children.length)
      subListContainerElem.removeChild(subListElems);
  }

  /**
   * Add subitem
   * @param {JSON} itemObj as specified in addItems
   * @param {String} id item ID
   */
  _loadSubItem(itemObj, id)
  {
    const subListItemElem = this._itemFromTmpl(itemObj, this.listSubItemTemplate);
    const listItemElem = this.getItemElem(id);
    const subContainer = listItemElem.querySelector("ul");

    if (!subContainer)
    {
      listItemElem.dataset.expanded = true;
      const subListElem = document.createElement("ul");
      subListElem.appendChild(subListItemElem);
      listItemElem.appendChild(subListElem);
      this.selectItem(itemObj.id, id, "start");
    }
    else
    {
      subContainer.appendChild(subListItemElem);
    }
  }

  /**
   * DEPRECATED use removeItem(id, parentId) instead
   * Remove subitem
   * @param {String} parentId main item ID
   * @param {String} id subItem ID
   */
  removeSubItem(parentId, id)
  {
    const {index} = this.getItemIndex(parentId);
    if (index === false)
      return false;

    const item = this.items[index];
    const listItemElem = this.listElem.children[index];
    const subListItemElem = listItemElem.querySelector("ul");

    for (let i = 0; i < item.subItems.length; i++)
    {
      if (item.subItems[i].id == id)
      {
        if (item.subItems.length == 1)
        {
          this._onAction("next-sibling", listItemElem);
          listItemElem.removeChild(subListItemElem);
        }
        else
        {
          subListItemElem.children[i].parentElement.removeChild(
            subListItemElem.children[i]);
        }
        item.subItems.splice(i, 1);
      }
    }
  }

  /**
   * Deprecated use empty(id) instead
   * Remove All sub items
   * @param {String} id main item ID
   */
  removeAllSubItems(id)
  {
    const {item} = this.getItem(id, null, false);
    if (!item)
      return false;

    let i = item.subItems.length;
    while (i--) // Avoide re-indexing
      this.removeSubItem(item.id, item.subItems[i].id);

    delete item.subItems;
  }

  /**
   * DEPRECTATED
   * Check for subItem existance
   * @param {String} id main item ID
   * @param {String} id subItem ID
   * @return {Boolean} result
   */
  hasSubItem(parentId, id)
  {
    const {parentItem} = this.getItem(parentId);
    if (!parentItem || !parentItem.subItems)
      return false;

    for (let i = 0; i < parentItem.subItems.length; i++)
    {
      if (parentItem.subItems[i].id == id)
        return true;
    }
    return false;
  }

  /**
   * Update list element using itemObj
   * @param {JSON} itemObj
   * @param {Node} listElem target <li> element
   */
  _updateListElem(itemObj, listElem)
  {
    const datasetObj = itemObj.dataset;
    listElem.dataset.id = itemObj.id;
    for (const name in datasetObj)
      listElem.dataset[name] = datasetObj[name];

    const textsObj = itemObj.texts;
    for (const name in textsObj)
    {
      const textElement = listElem.querySelector("[data-text='"+ name +"']");
      if (textElement)
        textElement.textContent = textsObj[name];
    }
    const titleObjs = itemObj.titles;
    for (const title in titleObjs)
    {
      const titleElement = listElem.querySelector("[data-text='"+ title +"']");
      if (titleElement)
        titleElement.title = titleObjs[title];
    }

    // Set default tabindex to the first list Element
    if (this.listElem.childElementCount == 0)
      listElem.setAttribute("tabindex", "0");
    else
      listElem.setAttribute("tabindex", "-1");
  }

  /**
   * Create list element from template
   * @param {JSON} itemObj
   * @param {Template} template
   * @return {Node} node
   */
  _itemFromTmpl(itemObj, template)
  {
    const tmpContent = template.content;
    const tmpList = tmpContent.querySelector("li");

    this._updateListElem(itemObj, tmpList);
    return document.importNode(tmpContent, true);
  }

  /**
   * Empty list or sublist
   * @param {String} id item ID, if specified all subitems are
   *                          emptied(optional)
   */
  empty(id)
  {
    if (id)
    {
      const item = this.getItem(id, null, false);
      const element = this.getItemElem(id);
      if (item)
        delete item.subItems;
      if (element)
        element.removeChild(element.querySelector("ul"));
    }
    else
    {
      this.items = [];
      this.listElem.innerHTML = "";
    }
  }

  /**
   * Get the index (position) of the item
   * @param {String} id
   * @param {String} parentId used for getting subItems
   * @return {Number} index of the item or -1 if can't find
   */
  getItemIndex(id, parentId)
  {
    let items = this.items;
    if (parentId)
    {
      const item = this.getItem(parentId, null, false);
      if (item && item.subItems)
        items = item.subItems;
      else
        return -1
    }

    if (!items)
      return -1;

    for (let i = 0; i < items.length; i++)
      if (items[i].id === id)
        return i;
    return -1;
  }

  /**
   * Getting the DOM Element that corresponds to the item using id
   * @param {String} id main item ID
   * @param {String} parentId used for getting subItems
   * @return {Node} DOM Element
   */
  getItemElem(id, parentId)
  {
    const index = this.getItemIndex(id, parentId);
    if (index === -1)
      return null;
    let parentElem = this.listElem;
    if (parentId)
    {
      const parentIndex = this.getItemIndex(parentId);
      parentElem = parentElem.children[parentIndex].querySelector("ul");
    }
    return parentElem.children[index];
  }

  /**
   * Getting the item
   * @param {String}  id main item ID
   * @param {String}  parentId used for getting subItems
   * @param {Boolean} _deepCopy if false returns shallow copy (default: true)
   * @return {JSON}   object of the item or null if can't find
   */
  getItem(id, parentId, _deepCopy = true)
  {
    const index = this.getItemIndex(id, parentId);
    if (index === -1)
      return null;
    let items = this.items;
    if (parentId)
      items = items[this.getItemIndex(parentId)].subItems;
    const item = items[index];
    if (_deepCopy)
      return deepCopy(item);

    return item;
  }

  /**
   * Update the item and DOM
   * @param {JSON}    newItemObj
   * @param {String}  id ID of the main Item
   * @param {String}  parentId used for updating subitems
   * @param {Boolean} _deepCopy uses shallow copy when false (default: true)
   */
  updateItem(newItemObj, id, parentId, _deepCopy=true)
  {
    const itemCopy = _deepCopy ? deepCopy(newItemObj) : newItemObj;
    const itemElem = this.getItemElem(id, parentId);
    const wasFocused = itemElem ?
                       itemElem.isSameNode(this._getActiveElement()) : false;
    this.removeItem(id, parentId);
    this.addItems([itemCopy], parentId);
    if (wasFocused)
      this.selectItem(itemCopy.id, parentId);
  }

  /**
   * Deprecated
   * Reverse focus first or last list item
   * @param {Node} parentElement list item parent element
   * @param {Boolean} isFirst focus first if true otherwise last element
   */
  focusEdgeElem(parentElement, isFirst)
  {
    //TODO: use utils method instead 
    let childElem = isFirst ? parentElement.firstChild : parentElement.lastChild;
    while(childElem != null && childElem.nodeType == 3)
      childElem = isFirst ? childElem.nextSibling : childElem.previousSibling;

    if (childElem)
      childElem.focus();
  }

  _getActiveElement()
  {
    return this.shadowRoot.activeElement;
  }

  /**
   * Managing focus of the element, can select item by ID or switch selection
   * @param {String} id Item
   * @param {String} parentId used for accessing sub item
   * @param {String} type possible values "next", "previous", "end", "start"
   */
  selectItem(id, parentId, type)
  {
    const relativeElement = this.getItemElem(id, parentId);
    const parentItemElement = this.getItemElem(parentId);
    const isEdgeRequest = type === "start" || type === "end";
    if (!relativeElement && !isEdgeRequest)
      return;

    if (!type && relativeElement)
    {
      relativeElement.focus();
      return;
    }
    switch (type)
    {
      case "next":
        const nextElem = relativeElement.nextElementSibling;
        if (!nextElem)
          this.selectItem(id, parentId, "start");
        else
          nextElem.focus();
        break;
      case "previous":
        const previousElem = relativeElement.previousElementSibling;
        if (!previousElem)
          this.selectItem(id, parentId, "end");
        else
          previousElem.focus();
        break;
      case "start":
        if (parentItemElement)
          parentItemElement.querySelector("ul").firstElementChild.focus();
        else
          this.listElem.firstElementChild.focus();
        break;
      case "end":
        if (parentItemElement)
          parentItemElement.querySelector("ul").lastElementChild.focus();
        else
          this.listElem.lastElementChild.focus();
        break;
    }
  }

  /**
   * Get parent element id
   * @param  {Node} element DOM Node child of table list item
   * @return {String} id or null if can't find
   */
  _getParentItemElemId(element)
  {
    while(element)
    {
      element = element.parentElement;
      if (element && element.tagName === "LI" && element.dataset.id)
      {
        return element.dataset.id;
      }
    }
    return null;
  }

  /**
   * Action listener
   * @param {String} action
   * @param {Node} element target
   */
  _onAction(action, element)
  {
    switch (action)
    {
      case "next-sibling":
        this.selectItem(element.dataset.id, this._getParentItemElemId(element), "next");
        break;
      case "previouse-sibling":
        this.selectItem(element.dataset.id, this._getParentItemElemId(element), "previous");
        break;
    }
  }
}

customElements.define('table-list', SettingList);
