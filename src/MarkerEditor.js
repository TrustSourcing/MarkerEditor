/**
 * Map module class
 * Requirements:
 * http://maps.google.com/maps/api/js?sensor=false&libraries=drawing
 * //code.jquery.com/jquery-1.10.2.js
 * //code.jquery.com/ui/1.11.3/jquery-ui.js
 * MapModule.js // main widget class
 *
 * optional:
 * geoxml3.js // load kml file
 * ProjectedOverlay.js // use overlays
 * jquery.ddslick.min.js // use custom markers
 **/
$(function() {
    $.widget( "custom.markerEditor", {
        // default options
        map: null,
        markerCount: 0,
        markers: [],
        infoWindow: null,
        lstnr: null,
        ddData: [],
        drawingManager: null,
        markerClusterer: null,
        options: {
            startMarkers: [],
            markersStyles: [],
            lng : -97,
            lat : 38,
            zoom : 4,
            mapType : google.maps.MapTypeId.ROADMAP,
            useMarkerClustering: false,
            gridSize: 40,
            styles: []
        },
        settingsInfoWindow: null,
        // the constructor
        _create: function() {
            this._initializeMap();
            this._initDrawingManager();
        },
        _initializeMap: function() {
            var googleOptions = {
                zoom: this.options.zoom,
                center: new google.maps.LatLng(this.options.lat, this.options.lng),
                disableAutoPan: true,
                mapTypeId: this.options.maptype,
                styles: this.options.styles,
                disableDefaultUI: true
            };
            this.map = new google.maps.Map(this.element[0], googleOptions);
        },
        _settingsWindowOnClose: function (marker, self, is_new) {
            if (is_new) {
                google.maps.event.addListener(
                    marker,
                    'click',
                    function () {
                        self.infoWindow.setContent(this.infoWindowHtml);
                        self.infoWindow.open(self.map, this);
                    }
                );
                google.maps.event.addListener(
                    marker,
                    'dblclick',
                    function () {
                        self.infoWindow.close(self.map, this);
                        self._setupMarker(marker, self, false);
                    }
                );
                //make the marker no longer draggable, and set it's
                //store the marker
                self.markers.push(marker);
                self.markerCount++;
            }
            //DOM elements (the icon itself) actual title property
            marker.setOptions({draggable:false, title:marker.title});
            //re-enable the drawingManager to MARKER mode
            //self.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.MARKER);
            self.drawingManager.setOptions({
                drawingControl: true
            });
            if (self.options.useMarkerClustering) {
                self._refreshMap(self);
            }
        },
        _getInfoWindowHtml: function (marker) {
            return '<div><h1>' + marker.title + '</h1>' + marker.description + '</div>';
        },
        _updateMarker: function (marker) {
            marker.title = document.getElementById('mapModule_titleInput').value;
            marker.description = document.getElementById('mapModule_descInput').value;
            marker.infoWindowHtml = this._getInfoWindowHtml(marker);
        },
        _refreshMap: function (self) {
            // Clear all markers
            if (self.markerClusterer) {
                self.markerClusterer.clearMarkers();
            }

            var mcOptions = {
                maxZoom: null,
                gridSize: self.options.gridSize
            };
            self.markerClusterer = new MarkerClusterer(self.map, self.markers, mcOptions);
        },
        _setupMarker: function (marker, self, is_new) {
            google.maps.event.removeListener(self.lstnr);
            self.settingsInfoWindow.open(self.map, marker);
            //in order to actually drag the marker, we need to
            //temporarily disable the drawingManager
            self.drawingManager.setDrawingMode(null);
            self.drawingManager.setOptions({
                drawingControl: false
            });

            document.getElementById('mapModule_titleInput').value = marker.title?marker.title:'';
            document.getElementById('mapModule_descInput').value = marker.description?marker.description:'';
            //need a slight delay before setting focus on the title input
            window.setTimeout(
                function () {
                    document.getElementById('mapModule_titleInput').focus();
                },
                50
            );
            //allow fine tweaking of the markers position, marker will be
            //draggable only while the settingsInfoWindow is open.
            //Also explicitly setting the markers icon, because if it's not set
            //then getIcon() doesn't work so good otherwise.
            marker.setOptions({
                draggable: true
            });
            if (self.options.markersStyles.length > 0) {
                $('#mapModule_markerIcon').ddslick('destroy');
                var index = 0;
                if (!is_new) {
                    index = self.options.markersStyles.indexOf(marker.icon);
                }
                $('#mapModule_markerIcon').ddslick({
                    data: self.ddData,
                    width: 200,
                    imagePosition: "left",
                    selectText: "",
                    onSelected: function (data) {
                        marker.setIcon(data.selectedData.value);
                    }
                });
                $('#mapModule_markerIcon').ddslick('select', {index: index });
                $('#mapModule_markerIcon').parents('.gm-style-iw').css('overflow', 'visible');
                $('#mapModule_markerIcon').parents('.gm-style-iw div').css('overflow', 'visible');
            }
            $('#mapModule_titleInput, #mapModule_descInput').off('change').on('change', function(){
                self._updateMarker(marker);
            });

            $('#mapModule_removeInput').off('click').on('click', function(){
                var index = self.markers.indexOf(marker);
                marker.setMap(null);
                self.markers.splice(index, 1);
                self.markerCount--;
                self.drawingManager.setOptions({
                    drawingControl: true
                });
            });


            self.lstnr = google.maps.event.addListener(
                self.settingsInfoWindow,
                'closeclick',
                function () {
                    self._settingsWindowOnClose(marker, self, is_new);
                }
            );
        },
        _setAllMap: function(map) {
            for (var i = 0; i < this.markers.length; i++) {
                this.markers[i].setMap(map);
            }
        },
        _clearMarkers: function() {
            this._setAllMap(null);
        },
        _showMarkers: function() {
            this._setAllMap(this.map);
        },
        _loadStartMarkers: function() {
            var self = this;
            for (var i in self.options.startMarkers) {
                var markerOptions = self.options.startMarkers[i];
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(markerOptions.latitude, markerOptions.longitude),
                    map: self.map,
                    title: markerOptions.title,
                    description: markerOptions.description,
                    icon: markerOptions.icon
                });
                marker.infoWindowHtml = this._getInfoWindowHtml(marker);
                google.maps.event.addListener(
                    marker,
                    'click',
                    function () {
                        self.infoWindow.setContent(this.infoWindowHtml);
                        self.infoWindow.open(self.map, this);
                    }
                );
                google.maps.event.addListener(
                    marker,
                    'dblclick',
                    function () {
                        self.infoWindow.close(self.map, this);
                        self._setupMarker(this, self, false);
                    }
                );
                self.markers[i] = marker;
            }
            self.markerCount = self.options.startMarkers.length;
            if (self.options.useMarkerClustering) {
                self._refreshMap(self);
            }
        },
        getMarkers: function() {
            var markerOptions = [];
            for (var i in this.markers) {
                var marker = this.markers[i];
                markerOptions.push({
                    latitude: marker.position.lat(),
                    longitude: marker.position.lng(),
                    title: marker.title,
                    description: marker.description,
                    icon: marker.icon
                });
            }
            return markerOptions;
        },
        toggleClustering: function (){
            var self = this;
            self.options.useMarkerClustering = !self.options.useMarkerClustering;
            self.markerClusterer.clearMarkers();
            self._showMarkers();
            if (self.options.useMarkerClustering) {
                self._refreshMap(self);
            }
        },
        _initDrawingManager: function() {
            var self = this;
                self.drawingManager = new google.maps.drawing.DrawingManager({
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [
                            google.maps.drawing.OverlayType.MARKER,
                        ]
                    }
                });
                self.drawingManager.setMap(this.map);
                //settingsInfoWindow will be displayed upon creation of a marker
                var selectHtml = '';
                if (self.options.markersStyles.length > 0) {
                    for (var i in this.options.markersStyles) {
                        self.ddData[i] = {
                            text: "marker",
                            value: this.options.markersStyles[i],
                            selected: (i == 0),
                            description: "",
                            imageSrc: this.options.markersStyles[i]
                        };
                    }
                    selectHtml = '<select id="mapModule_markerIcon"></select><br>';
                }

                var settingsHtml = [
                        '<span style="font-size:0.8em;">You may drag this marker ',
                        'to fine tune positioning.<br>Enter Title and',
                        'Description information below</span><br>',
                        '<label style="width: 100px; display: inline-block; font-weight: bold; margin: 10px 0;" for="mapModule_titleInput">Title: </label><input id="mapModule_titleInput" value=""><br>',
                        '<label style="width: 100px; display: inline-block; font-weight: bold; margin: 10px 0;" for="mapModule_descInput">Description: </label><input id="mapModule_descInput" value=""><br>',
                        selectHtml,
                        '<button id="mapModule_removeInput">Remove</button>'
                    ],
                    settingsDiv = document.createElement('div');
                settingsDiv.innerHTML = settingsHtml.join('');
                self.infoWindow = new google.maps.InfoWindow();
                self.settingsInfoWindow = new google.maps.InfoWindow();
                self.settingsInfoWindow.setContent(settingsDiv);
                google.maps.event.addListener(
                    this.drawingManager,
                    'markercomplete',
                    function (marker) {
                        self._setupMarker(marker, self, true)
                    }
                );
                self._loadStartMarkers();
        },
        // maybe i will need to clean something later
        _destroy: function() {
            $('#map_module_loader').remove();
            delete this.map;
        }
    });
});

