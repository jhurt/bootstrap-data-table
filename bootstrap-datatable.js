/*!
 * Bootstrap Data Table Plugin v1.5.5
 *
 * Author: Jeff Dupont
 * ==========================================================
 * Copyright 2012
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ==========================================================
 */
(function ($) {

    /* DATATABLE CLASS DEFINITION
     * ========================== */
    var DataTable = function (element, options) {
        this.$element = $(element);
        this.options = options;
        this.enabled = true;
        this.columns = [];
        this.rows = [];
        this.buttons = [];

        // this needs to be handled better
        this.localStorageId = "datatable_" + (options.id || options.url.replace(/\W/ig, '_'));

        // set the defaults for the column options array
        for (var column in this.options.columns) {
            // check sortable
            if (typeof this.options.columns[column].sortable === undefined) {
                this.options.columns[column].sortable = true;
            }
        }

        this.$default = this.$element.children().length ?
            this.$element.children() :
            $("<div></div>")
                .addClass("alert alert-error")
                .html("No Results Found");

        this.$element.addClass("clearfix");

        // clear out the localStorage for this entry
        if (localStorage) {
            localStorage[this.localStorageId] = 'false';
        }

        if (this.options.tablePreRender && typeof this.options.tablePreRender === 'function') {
            this.options.tablePreRender.call(this);
        }

        // initialize the toolbar
        _initToolbar.call(this)

        if (this.options.autoLoad === true) {
            this.render();
        }
    };

    DataTable.prototype = {

        constructor: DataTable, render: function () {
            var options = this.options
                , $e = this.$element;

            // show loading
            this.loading(true);

            // reset the columns and rows
            this.columns = [];
            this.rows = [];
            this.buttons = [];
            this.$wrapper = undefined;
            this.$table = undefined;
            this.$header = undefined;
            this.$body = undefined;
            this.$footer = undefined;
            this.$pagination = undefined;

            if (this.$toolbar) {
                this.$toolbar.remove();
            }

            // top
            this.$top_details = $("<div></div>").attr("id", "dt-top-details");
            // bottom
            this.$bottom_details = $("<div></div>").attr("id", "dt-bottom-details");

            // localize the object
            var that = this;

            // pull in the data from the ajax call
            if (options.url !== "") {
                $.ajax({
                    url: options.url + "?limit=" + options.perPage + "&offset=" + ((options.currentPage - 1) * options.perPage),
                    type: "GET",
                    success: function (response) {
                        that.resultset = response;

                        if (!response || response === undefined || !response.data || response.data.length == 0) {
                            showError.call(that);
                            return;
                        }

                        // clear out the current elements in the container
                        $e.empty();

                        // set the sort and filter configuration
                        options.sort = response.sort;
                        options.filter = response.filter;

                        // set the current page if we're forcing it from the server
                        if (response.currentPage) {
                            options.currentPage = parseInt(response.currentPage);
                        }

                        // retrieve the saved columns
                        _retrieveColumns.call(that, localStorage[that.localStorageId]);

                        // append the table
                        $e.append(that.table());

                        // append the detail boxes
                        $e.prepend(that.$top_details);
                        $e.append(that.$bottom_details);

                        // render the rest of the table
                        if (options.showHeader) {
                            that.header();
                        }
                        if (options.showFooter) {
                            that.footer();
                        }

                        // fill in the table body
                        that.body();

                        // render the pagination
                        if (options.showTopPagination && that.pagination()) {
                            that.$top_details.append(that.pagination().clone(true));
                        }
                        if (options.showPagination && that.pagination()) {
                            that.$bottom_details.append(that.pagination().clone(true));
                        }

                        // update the details for the results
                        that.details();

                        // initialize the toolbar
                        _initToolbar.call(that);

                        // nearly complete... let the user apply any final adjustments
                        if (options.tableCallback && typeof options.tableCallback === 'function') {
                            options.tableCallback.call(that);
                        }

                        that.loading(false);
                    }, error: function (e) {
                        if (options.debug) {
                            console.log(e);
                        }
                        showError.call(that);

                        that.loading(false);
                    }
                });
            }
        },
        loading: function (show) {
            var $e = this.$element;

            if (!this.$loading) {
                this.$loading = $("<div></div>")
                    .css({
                        position: 'absolute', top: parseInt($e.position().top) + 5, left: parseInt($e.position().left) + parseInt($e.css("marginLeft")) + Math.floor($e.width() / 4), width: Math.floor($e.width() / 2) + "px"
                    })
                    .append(
                        $("<div></div>")
                            .addClass("progress progress-striped active")
                            .append(
                                $("<div></div>").addClass("bar")
                            )
                    )
                    .appendTo(document.body);
            }

            if (show) {
                $e.css({ opacity: 0.2 });
            }
            else {
                $e.css({ opacity: 1 });

                this.$loading.remove();
                this.$loading = undefined;
            }
        },
        toolbar: function () {
            var options = this.options
                , $e = this.$element
                , that = this;

            this.$toolbar = $("<div></div>").addClass("dt-toolbar btn-toolbar pull-right");

            this.$button_group = $("<div></div>")
                .addClass("btn-group")
                .appendTo(this.$toolbar);

            // add all the custom buttons
            for (var i = 0; i < options.buttons.length; i++) {
                this.buttons.push(options.buttons[i]);
            }

            // attach all buttons to the toolbar
            $.each(this.buttons, function () {
                that.$button_group.append(this);
            });

            // attach the toolbar to the section header
            if (options.sectionHeader) {
                this.$section_header = $(options.sectionHeader);
                this.$section_header.append(this.$toolbar);
            }
            else if (options.title !== '' && !this.$section_header) {
                this.$section_header = $("<h2></h2>")
                    .text(options.title)
                    .append(this.$toolbar);
                $e.before(this.$section_header);
            }
            else {
                if (!this.$toolbar_container) {
                    this.$toolbar_container = $("<div></div>").addClass('dt-toolbar-container clearfix')
                }
                $e.prepend(
                    this.$toolbar_container.append(this.$toolbar)
                );
            }

            return this.$toolbar;
        },
        details: function () {
            var options = this.options
                , res = this.resultset
                , start = 0
                , end = 0
                , that = this;

            start = (options.currentPage * options.perPage) - options.perPage + 1
            if (start < 1) {
                start = 1;
            }

            end = (options.currentPage * options.perPage);
            if (end > options.totalRows) {
                end = options.totalRows;
            }

            $('<div class="pull-left"><p>Showing ' + start + ' to ' + end + ' of ' + options.totalRows + ' rows</p></div>')
                .prependTo(this.$bottom_details);
        },
        table: function () {
            var $e = this.$element
                , options = this.options;

            if (!this.$table_wrapper) {
                this.$wrapper = $("<div></div>").addClass("dt-table-wrapper");
            }

            if (!this.$table) {
                this.$table = $('<table></table>').addClass(options.class);
            }

            this.$wrapper.append(this.$table);
            return this.$wrapper;
        },
        header: function () {
            var options = this.options
                , res = this.resultset;

            if (!this.$header) {
                this.$header = $('<thead></thead>');
                var row = $('<tr></tr>');

                // loop through the columns
                for (var column in options.columns) {
                    var $cell = this.column(column)
                        , colprop = $cell.data("column_properties");

                    // attach the sort click event
                    if (colprop.sortable && !colprop.custom) {
                        $cell.click(this, this.sort).css({'cursor': 'pointer'});

                        for (var i = 0; i < options.sort.length; i++) {
                            if (options.sort[i][0] == colprop.field) {
                                if (options.sort[i][1] == "asc") {
                                    $cell.append($(options.ascending));
                                    colprop.sortOrder = "asc";
                                }
                                else if (options.sort[i][1] == "desc") {
                                    $cell.append($(options.descending));
                                    colprop.sortOrder = "desc";
                                }
                            }
                        }
                    }

                    row.append($cell);
                    this.$header.append(row);
                    this.columns.push($cell);
                }

                // any final user adjustments to the header
                if (options.headerCallback && typeof options.headerCallback === 'function') {
                    options.headerCallback.call(this);
                }

                this.$table.append(this.$header);
            }
            return this.$header;
        },
        footer: function () {
            var options = this.options
                , res = this.resultset

            if (!this.$footer) {
                this.$footer = $('<tfoot></tfoot>');

                // loop through the columns
                for (column in options.columns) {
                    var $cell = $('<td></td>')

                    $cell
                        .data("cell_properties", options.columns[column])
                        .addClass(options.columns[column].classname);

                    this.$footer.append($cell);
                }

                // any final user adjustments to the footer
                if (options.footerCallback && typeof options.footerCallback === 'function') {
                    options.footerCallback.call(this, this.resultset.footer);
                }

                this.$table.append(this.$footer);
            }
            return this.$footer;
        },
        body: function () {
            var res = this.resultset
                , options = this.options;

            if (!this.$body) {
                this.$body = $('<tbody></tbody>');

                // loop through the results
                for (var i = 0; i < res.data.length; i++) {
                    var row = this.row(res.data[i]);
                    this.$body.append(row);
                    this.rows.push(row);
                }

                if (options.showFilterRow) {
                    this.$body.prepend(this.filter());
                }

                this.$table.append(this.$body);
            }
            return this.$body;
        },
        filter: function () {
            var $row = $("<tr></tr>")
                , options = this.options
                , that = this;

            $row.addClass("dt-filter-row");

            // loop through the columns
            for (var column in options.columns) {
                var $cell = $("<td></td>")
                    .addClass(options.columns[column].classname);

                if (options.columns[column].hidden) {
                    $cell.hide();
                }

                if (options.columns[column].filter && options.columns[column].field) {
                    $cell
                        .append(
                            $("<input/>")
                                .attr("name", "filter_" + options.columns[column].field)
                                .data("filter", options.columns[column].field)
                                .val(options.filter[options.columns[column].field] || "")
                                // .change(this, this.runFilter)
                                .change(function (e) {
                                    runFilter.call(this, that);
                                })
                        );
                }

                $row.append($cell);
            }
            return $row;
        },
        row: function (rowdata) {
            var $row = $("<tr></tr>")
                , options = this.options;

            // loop through the columns
            for (var column in options.columns) {
                var cell = this.cell(rowdata, column);
                $row.append(cell);
            }

            // callback for postprocessing on the row
            if (options.rowCallback && typeof options.rowCallback === "function") {
                $row = options.rowCallback($row, rowdata);
            }

            return $row;
        },
        cell: function (data, column) {
            var celldata = data[this.options.columns[column].field] || this.options.columns[column].custom;
            var $cell = $('<td></td>');
            var options = this.options;

            var action = this.options.columns[column].action;
            if (action) {
                var actionClass = this.options.columns[column].actionClass;
                var actionDataValue = data[this.options.columns[column].actionDataField];
                $cell = $('<td align="center"><a href="#" class="btn btn-default ' + actionClass
                    + '" data-action-value="' + actionDataValue + '">'
                    + this.options.columns[column].action + '</a></td>');

                if (!options.actionHandlers.hasOwnProperty(actionClass)) {
                    var actionCallback = this.options.columns[column].actionCallback;
                    $(document).on("click", "." + actionClass, function (e) {
                        var dataActionValue = $(this).attr("data-action-value");
                        actionCallback(dataActionValue);
                    });
                    options.actionHandlers[actionClass] = true;
                }
            }

            // preprocess on the cell data for a column
            if (options.columns[column].callback && typeof options.columns[column].callback === "function") {
                celldata = options.columns[column].callback.call($cell, data, options.columns[column]);
            }

            $cell
                .data("cell_properties", options.columns[column])
                .addClass(options.columns[column].classname)
                .append(celldata || "&nbsp;");

            if (options.columns[column].css) {
                $cell.css(options.columns[column].css);
            }

            if (options.columns[column].hidden) {
                $cell.hide();
            }

            return $cell;
        },
        column: function (column) {
            var $cell = $('<th></th>')
                , options = this.options
                , classname = "dt-column_" + column + Math.floor((Math.random() * 1000) + 1);

            options.columns[column].classname = classname;

            $cell
                .data("column_properties", options.columns[column])
                .addClass(classname)
                .text(options.columns[column].title);

            if (options.columns[column].css) {
                $cell.css(options.columns[column].css);
            }

            if (options.columns[column].hidden) {
                $cell.hide();
            }

            return $cell;
        },
        sort: function (e) {
            var colprop = $(this).data("column_properties")
                , that = e.data
                , options = e.data.options
                , found = false;

            colprop.sortOrder = colprop.sortOrder ? (colprop.sortOrder == "asc" ? "desc" : "") : "asc";

            if (options.allowMultipleSort) {
                // does the sort already exist?
                for (var i = 0; i < options.sort.length; i++) {
                    if (options.sort[i][0] == colprop.field) {
                        options.sort[i][1] = colprop.sortOrder;
                        if (colprop.sortOrder === "") options.sort.splice(i, 1);
                        found = true;
                    }
                }
                if (!found) {
                    options.sort.push([colprop.field, colprop.sortOrder]);
                }
            }
            else {
                // clear out any current sorts
                options.sort = [];
                options.sort.push([colprop.field, colprop.sortOrder]);
            }
            if (options.debug) {
                console.log(options.sort);
            }

            that.render();
        },
        pagination: function () {
            var $e = this.$element
                , that = this
                , options = this.options
                , res = this.resultset;

            // no paging needed
            if (options.perPage >= options.totalRows) return;

            if (!this.$pagination) {
                this.$pagination = $("<div></div>").addClass("pull-right");

                // how many pages?
                options.pageCount = Math.ceil(options.totalRows / options.perPage);

                // setup the pager container and the quick page buttons
                var $pager = $("<ul></ul>").addClass("pagination")
                    , $first = $("<li></li>").append(
                        $("<a></a>")
                            .attr("href", "#")
                            .data("page", 1)
                            .html("&laquo;")
                            .click(function () {
                                options.currentPage = 1
                                that.render();
                                return false;
                            })
                    )
                    , $previous = $("<li></li>").append(
                        $("<a></a>")
                            .attr("href", "#")
                            .data("page", options.currentPage - 1)
                            .html("&lt;")
                            .click(function () {
                                options.currentPage -= 1
                                options.currentPage = options.currentPage >= 1 ? options.currentPage : 1
                                that.render();
                                return false;
                            })
                    )
                    , $next = $("<li></li>").append(
                        $("<a></a>")
                            .attr("href", "#")
                            .data("page", options.currentPage + 1)
                            .html("&gt;")
                            .click(function () {
                                options.currentPage += 1
                                options.currentPage = options.currentPage <= options.pageCount ? options.currentPage : options.pageCount
                                that.render();
                                return false;
                            })
                    )
                    , $last = $("<li></li>").append(
                        $("<a></a>")
                            .attr("href", "#")
                            .data("page", options.pageCount)
                            .html("&raquo;")
                            .click(function () {
                                options.currentPage = options.pageCount
                                that.render();
                                return false;
                            })
                    );


                var totalPages = options.pagePadding * 2
                    , start
                    , end;

                if (totalPages >= options.pageCount) {
                    start = 1;
                    end = options.pageCount;
                }
                else {
                    start = options.currentPage - options.pagePadding;
                    if (start <= 0) start = 1;

                    end = start + totalPages;
                    if (end > options.pageCount) {
                        end = options.pageCount;
                        start = end - totalPages;
                    }
                }

                // append the pagination links
                for (var i = start; i <= end; i++) {
                    var $link = $("<li></li>")
                        .append(
                            $("<a></a>")
                                .attr("href", "#")
                                .data("page", i)
                                .text(i)
                                .click(function () {
                                    options.currentPage = $(this).data('page')
                                    that.render();
                                    return false;
                                })
                        );

                    if (i == options.currentPage) {
                        $link.addClass("active");
                    }

                    $pager.append($link);
                }

                // append quick jump buttons
                if (options.currentPage == 1) {
                    $first.addClass("disabled");
                    $previous.addClass("disabled");
                }
                if (options.currentPage == options.pageCount) {
                    $next.addClass("disabled");
                    $last.addClass("disabled");
                }
                $pager.prepend($first, $previous);
                $pager.append($next, $last);

                this.$pagination.append($pager);
            }
            return this.$pagination;
        }, remove: function () {
            var $e = this.$element

            if (this.$section_header) this.$section_header.remove();

            $e.data("datatable", null);
            $e.empty();
        }
    };


    /* DATATABLE PRIVATE METHODS
     * ========================= */

    function _initToolbar() {
        var options = this.options;

        // create the perpage dropdown
        _initPerPage.call(this);

        // handle filter options
        if (options.filterModal)  {
            _initFilterModal.call(this);
        }

        // handle the column management
        if (options.toggleColumns) {
            _initColumnModal.call(this);
        }

        // handle the overflow option
        if (options.allowOverflow) {
            _initOverflowToggle.call(this);
        }

        // initialize the table info
        if (options.allowTableinfo) {
            _initTableInfo.call(this);
        }

        // create the buttons and section functions
        this.toolbar();
    }

    function _initColumnModal() {
        var options = this.options
            , $e = this.$element
            , $top_details = this.$top_details
            , $toggle = $("<a></a>");

        // localize the object
        var that = this;

        if (!this.$column_modal) {
            var randId = Math.floor((Math.random() * 100) + 1);
            this.$column_modal = $('<div></div>')
                .attr("id", "dt-column-modal_" + randId)
                .attr("tabindex", "-1")
                .attr("role", "dialog")
                .attr("aria-labelledby", "dt-column-modal-label_" + randId)
                .attr("aria-hidden", "true")
                .addClass("modal fade")
                .hide();

            // render the modal header
            this.$column_modalheader = $("<div></div>")
                .addClass("modal-header")
                .append(
                    $("<button></button>")
                        .addClass("close")
                        .data("dismiss", "modal")
                        .attr("aria-hidden", "true")
                        .html('&times;')
                        .click(function () {
                            that.$column_modal.modal('hide');
                        })
                )
                .append(
                    $("<h3></h3>")
                        .addClass("modal-title")
                        .attr("id", "dt-column-modal-label_" + randId)
                        .text("Toggle Columns")
                );

            // render the modal footer
            this.$column_modalfooter = $("<div></div>")
                .addClass("modal-footer")
                .append(
                    // show the check 'all / none' columns
                    $('<div class="pull-left"></div>')
                        .append(
                            $('<div class="btn-group"></div>')
                                .append(
                                    $('<button></button>')
                                        .addClass("btn btn-info")
                                        .append(
                                            $("<span></span>")
                                                .addClass("glyphicon glyphicon-check")
                                                .text("All")
                                        )
                                        .click(function () {
                                            $(this).closest(".modal").find('button.on-off').each(function () {
                                                if ($(this).data('column-hidden')) {
                                                    $(this).click();
                                                }
                                            })
                                            return false;
                                        }),
                                    $('<button></button>')
                                        .addClass("btn btn-warning")
                                        .append(
                                            $("<span></span>")
                                                .addClass("glyphicon glyphicon-unchecked")
                                                .text("None")
                                        )
                                        .click(function () {
                                            $(this).closest(".modal").find('button.on-off').each(function () {
                                                if (!$(this).data('column-hidden')) {
                                                    $(this).click();
                                                }
                                            })
                                            return false;
                                        })
                                )
                        )

                    , options.allowSaveColumns ? $("<button></button>")
                        .addClass("btn btn-primary")
                        .text("Save")
                        .click(function () {
                            _saveColumns.call(that)
                            return false;
                        }) : ""

                    , $("<button></button>")
                        .addClass("btn btn-default")
                        .data('dismiss', 'modal')
                        .append(
                            $("<span></span>")
                        )
                        .text("Close")
                        .click(function () {
                            that.$column_modal.modal('hide')
                            return false;
                        })
                );

            // render the modal body
            this.$column_modalbody = $("<div></div>")
                .addClass("modal-body");

            this.$column_modaldialog = $("<div></div>")
                .addClass("modal-dialog")
                .append(
                    $("<div></div>")
                        .addClass("modal-content")
                        .append(
                            this.$column_modalheader
                            , this.$column_modalbody
                            , this.$column_modalfooter
                        )
                );

            // render and add the modal to the container
            this.$column_modal
                .append(
                    this.$column_modaldialog
                ).appendTo(document.body);
        }
        // render the display modal button
        $toggle
            .addClass("btn")
            .data("toggle", "modal")
            .data("content", "Choose which columns you would like to display.")
            .data("target", "#" + this.$column_modal.attr("id"))
            .attr("href", "#" + this.$column_modal.attr("id"))
            .append(
                $("<span></span>")
                    .addClass("glyphicon glyphicon-cog")
            )
            .click(function (e) {
                that.$column_modal
                    .on('show.bs.modal', function () {
                        if (options.debug) console.log(that);
                        _updateColumnModalBody.call(that, that.$column_modalbody);
                    })
                    .modal();
                return false;
            })
            .popover({
                "trigger": 'hover',
                "placement": 'top'
            });
        this.buttons.unshift($toggle);

        if (options.debug) {
            console.log($toggle);
        }

        return this.$column_modal;
    }

    function _initFilterModal() {
        var options = this.options
            , $e = this.$element
            , $toggle = $("<a></a>");

        // render the display modal button
        $toggle
            .addClass("btn")
            .data("toggle", "modal")
            .attr("href", "#")
            .data("content", "Open the filter dialog.")
            .extend(
                $("<span></span>")
                    .addClass("glyphicon glyphicon-filter")
            )
            .click(function () {
                if ($(options.filterModal).hasClass("modal")) {
                    $(options.filterModal).modal();
                }
                else if ($(options.filterModal).is(":visible")) {
                    $(options.filterModal).hide();
                }
                else {
                    $(options.filterModal).show();
                }
                return false;
            })
            .popover({
                "trigger": 'hover',
                "placement": 'top'
            });
        this.buttons.unshift($toggle);
    }

    function _initPerPage() {
        var options = this.options
            , $e = this.$element
            , that = this;

        // per page options and current filter/sorting
        var $perpage_select = $("<a></a>")
            .addClass("btn dropdown-toggle")
            .data("content", "Change the number of rows per page.")
            .attr("data-toggle", "dropdown")
            .html(options.perPage + "&nbsp;")
            .css({ fontWeight: 'normal' })
            .append(
                $("<span></span>").addClass("caret")
            )
            .popover({
                "trigger": 'hover',
                "placement": 'top'
            });
        this.buttons.push($perpage_select);

        var $perpage_values = $("<ul></ul>")
            .addClass("dropdown-menu")
            .css({ fontSize: 'initial', fontWeight: 'normal' })
            .append(
                $('<li data-value="10"><a href="#">10</a></li>')
                    .click(function () {
                        _updatePerPage.call(this, that);
                        return false;
                    })
                , $('<li data-value="20"><a href="#">20</a></li>')
                    .click(function () {
                        _updatePerPage.call(this, that);
                        return false;
                    })
                , $('<li data-value="50"><a href="#">50</a></li>')
                    .click(function () {
                        _updatePerPage.call(this, that);
                        return false;
                    })
                , $('<li data-value="100"><a href="#">100</a></li>')
                    .click(function () {
                        _updatePerPage.call(this, that);
                        return false;
                    })
                , $('<li data-value="150"><a href="#">200</a></li>')
                    .click(function () {
                        _updatePerPage.call(this, that);
                        return false;
                    })
            );
        this.buttons.push($perpage_values);
    }

    function _initTableInfo() {
        var options = this.options
            , $e = this.$element
            , $info = $("<a></a>");

        // render the display modal button
        $info
            .addClass("btn")
            .attr("href", "#")
            .append(
                $("<span></span>")
                    .addClass("glyphicon glyphicon-info-sign")
            )
            .click(function () {
                return false;
            });

        var $page_sort = []
            , $page_filter = [];

        // sort
        $.each(options.sort, function (i, v) {
            if (!v.length) return;
            var heading;
            for (var column in options.columns) {
                if (options.columns[column].field == v[0]) {
                    heading = options.columns[column].title;
                }
            }
            $page_sort.push(heading + " " + v[1].toUpperCase());
        });

        // filter
        $.each(options.filter, function (k, v) {
            var heading;
            for (var column in options.columns) {
                if (options.columns[column].field == k) {
                    heading = options.columns[column].title;
                }
            }
            $page_filter.push((heading || k) + " = '" + v + "'");
        });
        $($info)
            .data("content",
                $('<dl></dl>').append(
                    $page_sort.length > 0 ? '<dt><i class="icon-th-list"></i> Sort:</dt><dd>' + $page_sort.join(", ") + '</dd>' : ''
                    ,
                    $page_filter.length > 0 ? '<dt><i class="icon-filter"></i> Filter:</dt><dd>' + $page_filter.join(", ") + '</dd>' : ''
                ))
            .popover({
                placement: "bottom"
            });

        this.buttons.unshift($info);
    }

    function _initOverflowToggle() {
        var options = this.options
            , $wrapper = this.$wrapper
            , $overflow = $("<a></a>");

        // create the button
        $overflow
            .addClass("btn")
            .attr("href", "#")
            .attr("title", "Toggle the size of the table to fit the data or to fit the screen.")
            .append(
                $("<span></span>")
                    .addClass("glyphicon glyphicon-resize-full")
            )
            .click(function () {
                if ($wrapper) {
                    _toggleOverflow.call(this, $wrapper);
                }
                return false;
            });

        if (!this.resultset || !this.resultset.data || this.resultset.data.length == 0) {
            $overflow.addClass("disabled");
        }

        this.buttons.push($overflow);
    }

    function _toggleOverflow(el) {
        if (el.css('overflow') == 'scroll') {
            $(this).children("span.glyphicon").attr("class", "glyphicon glyphicon-resize-full");

            el.css({
                overflow: 'visible', width: 'auto'
            });
        }
        else {
            $(this).children("span.glyphicon").attr("class", "glyphicon glyphicon-resize-small");

            el.css({
                overflow: 'scroll', width: el.width()
            });
        }
    }

    function _updatePerPage(that) {
        var options = that.options;

        // update the perpage value
        options.perPage = $(this).data("value");

        // the offset
        var offset = options.currentPage * options.perPage;
        while (offset > options.totalRows) {
            options.currentPage--;
            offset = options.currentPage * options.perPage;
        }
        if (options.currentPage < 1) {
            options.currentPage = 1;
        }

        if ($(this).popover) {
            $(this).popover('hide');
        }

        // update the table
        that.render();

        return false;
    }

    function showError() {
        var options = this.options
            , $e = this.$element;

        $e.empty();

        // initialize the toolbar
        _initToolbar.call(this);

        // nearly complete... let the user apply any final adjustments
        if (options.tableCallback && typeof options.tableCallback === 'function') {
            options.tableCallback.call(this);
        }

        this.loading(false);

        if (this.$default) {
            $e.append(this.$default);
        }
    }

    function runFilter(that) {
        var options = that.options;

        options.filter[$(this).data("filter")] = $(this).val();
        if (options.debug) {
            console.log(options.filter);
        }

        that.render();
    }

    function _updateColumnModalBody(body) {
        var options = this.options
            , $container = $("<form></form>").addClass("form-inline")
            , that = this;

        // loop through the columns
        for (var column in options.columns) {
            if (options.columns[column].title === "") {
                continue;
            }
            var $item = $('<div></div>')
                .addClass('form-group')
                .append(
                    $("<label></label>")
                        .addClass("control-label")
                        .append(
                            options.columns[column].title,

                            $("<button></button>")
                                .addClass("on-off btn " + (options.columns[column].hidden ? 'btn-info' : 'btn-warning'))
                                .data("column", column)
                                .data("column-hidden", options.columns[column].hidden)
                                .text(options.columns[column].hidden ? "ON" : "OFF")
                                .click(function () {
                                    _toggleColumn.call(this, that);
                                    return false;
                                })
                        )
                );
            $container.append($item);
        }

        body.empty();
        body.append($container);
    }

    function _toggleColumn(that) {
        var options = that.options
            , column = $(this).data("column")
            , $column = $("." + options.columns[column].classname);

        if ($column.is(":visible")) {
            $column.hide();
            options.columns[column].hidden = true;
            $(this).removeClass("btn-warning").addClass("btn-info").text("ON").data("column-hidden", true);
        }
        else {
            $column.show();
            options.columns[column].hidden = false;
            $(this).removeClass("btn-info").addClass("btn-warning").text("OFF").data("column-hidden", false);
        }
        return false;
    }

    function _saveColumns() {
        var options = this.options
            , columns = [];

        // save the columns to the localstorage
        if (localStorage) {
            localStorage[this.localStorageId] = JSON.stringify(options.columns);
        }

        $.ajax({
            url: options.url, type: "POST", dataType: "json", data: $.extend({}, options.post, {
                action: "save-columns", columns: JSON.stringify(options.columns), sort: JSON.stringify(options.sort), filter: JSON.stringify(options.filter)
            }), success: function (res) {
                if (options.debug) console.log("columns saved");
            }
        });

        this.$column_modal.modal("hide");
    }

    function _retrieveColumns(data) {
        var options = this.options
            , columns = data ? JSON.parse(data) : []
            , res = this.resultset;

        // if the server doesn't pass the column property back
        if (!res.columns) {
            res.columns = [];
        }

        for (column in options.columns) {
            options.columns[column] = $.extend({}, options.columns[column], res.columns[column], columns[column]);
        }
    }


    /* DATATABLE PLUGIN DEFINITION
     * =========================== */

    $.fn.datatable = function (options) {
        $.fn.datatable.init.call(this, options, DataTable, 'datatable');
        return this;
    };

    $.fn.datatable.init = function (options, Constructor, name) {
        var datatable;

        if (options === true) {
            return this.data(name);
        } else if (typeof options == 'string') {
            datatable = this.data(name);
            if (datatable) {
                datatable[options]();
            }
            return this;
        }

        options = $.extend({}, $.fn[name].defaults, options);

        function get(el) {
            var datatable = $.data(el, name);

            if (!datatable) {
                datatable = new Constructor(el, $.fn.datatable.elementOptions(el, options));
                $.data(el, name, datatable);
            }

            return datatable;
        }

        this.each(function () {
            get(this);
        });

        return this;
    };

    $.fn.datatable.DataTable = DataTable;

    $.fn.datatable.elementOptions = function (el, options) {
        return $.metadata ? $.extend({}, options, $(el).metadata()) : options;
    };

    $.fn.datatable.defaults = {
        debug: true,
        id: undefined,
        title: 'Data Table Results',
        class: 'table table-striped table-bordered',
        perPage: 10,
        pagePadding: 2,
        sort: [],
        filter: {},
        post: {},
        actionHandlers: {},
        buttons: [],
        sectionHeader: undefined,
        totalRows: 0,
        currentPage: 1,
        showPagination: true,
        showTopPagination: false,
        showHeader: true,
        showFooter: false,
        showFilterRow: false,
        filterModal: undefined,
        allowExport: false,
        allowOverflow: true,
        allowMultipleSort: false,
        allowSaveColumns: true,
        toggleColumns: true,
        url: '',
        columns: [],
        ascending: $("<span></span>").addClass("glyphicon glyphicon-chevron-up"),
        descending: $("<span></span>").addClass("glyphicon glyphicon-chevron-down"),
        rowCallback: undefined,
        tableCallback: undefined,
        headerCallback: undefined,
        footerCallback: undefined,
        tablePreRender: undefined,
        autoLoad: true
    };
})(window.jQuery);
