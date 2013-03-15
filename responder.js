
const PATH = require("path");
const EXPRESS = require("express");
const HBS = require("hbs");
const UTIL = require("sm-util/lib/util");
const FS = require("sm-util/lib/fs");
const GLOB = require("glob");


var HELPERS = {
    mountStaticDir: function(app, route, path) {
        app.get(route, function(req, res, next) {
            var originalUrl = req.url;
            req.url = req.params[0];
            EXPRESS.static(path)(req, res, function() {
                req.url = originalUrl;
                return next.apply(null, arguments);
            });
        });
    },
    mountStaticFile: function(app, route, path) {
        app.get(route, function(req, res, next) {
            var originalUrl = req.url;
            if (/\.js$/.test(originalUrl)) {
                res.setHeader("Content-Type", "application/javascript");
            } else {
                // TODO: Add more content type headers by extension.
                //       Ideally we should determine content type by looking at file
                //       meta info (i.e. `response-headers.json`)
            }
            req.url = req.params[0] || "/response-body";
            EXPRESS.static(path)(req, res, function() {
                req.url = originalUrl;
                return next.apply(null, arguments);
            });
        });
    }
}


var app = null;
var interceptApp = null;


var api = {
    init: function(pinf, callback) {

        var config = pinf.config();

        app = EXPRESS();

        function initInterceptApp(callback) {
            if (!interceptApp) return callback(null);
            return interceptApp(pinf, callback);
        }

        function initHandlebars(callback) {

            // TODO: If resource is not found in program use default.

            function registerIncludePartials(callback) {
                // Go through all pages directories and look for `.inc` directories.
                // Any files in the `.inc` directories get registered as `inc/*` partials.
                return GLOB("**/.inc/*.hbs", {
                    cwd: PATH.join(config.pinf.paths.package, "pages")
                }, function (err, files) {
                    if (err) return callback(err);
                    if (!files || files.length === 0) return callback(null);
                    files.forEach(function(filepath) {
                        var name = "inc/" + PATH.basename(filepath).replace(/\.hbs$/, "");
                        HBS.registerPartial(name, function(options) {
                            var basePath = PATH.join(config.pinf.paths.package, "pages");
                            var dirPath = PATH.join(basePath, PATH.dirname(options.pageId));
                            var path = null;
                            while (true) {
                                path = PATH.join(dirPath, "." + name + ".hbs");
                                if (FS.existsSync(path)) break;
                                if (dirPath === basePath) return "";
                                dirPath = PATH.dirname(dirPath);
                            }
                            return HBS.compile(FS.readFileSync(path).toString())(options);
                        });
                    });
                    return callback(null);
                });
            }

            return registerIncludePartials(function(err) {
                if (err) return callback(err);

                [
                    "head",
                    "header",
                    "footer",
                    "foot"
                ].forEach(function(name) {
                    HBS.registerPartial(name, function(options) {
                        var path = PATH.join(options.settings.views, options.pageId + "." + name + ".hbs");
                        if (FS.existsSync(path)) {
                            return HBS.compile(FS.readFileSync(path).toString())(options);
                        } else
                        if (HBS.handlebars.partials["inc/" + name]) {
                            return HBS.handlebars.partials["inc/" + name](options);
                        } else {
                            return "";
                        }
                    });
                });

                app.set("view engine", "hbs");
                app.set("view options", {
                    layout: PATH.join(
                        PATH.relative(
                            PATH.join(config.pinf.paths.package, "pages"),
                            PATH.join(__dirname, "pages")
                        ),
                        "layout"
                    )
                });

                app.engine("html", HBS.__express);
                app.set("views", PATH.join(config.pinf.paths.package, "pages"));            
                app.get(/^\/(.*?)(\.html?)?$/, function(req, res, next) {
                    try {
                        res.locals = {
                            pageId: req.params[0] || "index"
                        };
                        res.render(res.locals.pageId);
                    } catch(err) {
                        return next();
                    }
                });

                return callback(null);
            });
        }

        return initInterceptApp(function(err) {
            if (err) return callback(err);

            HELPERS.mountStaticDir(app, /^\/static\/fuelux(\/.*)$/, PATH.join(__dirname, "node_modules/fuelux/dist"));
            HELPERS.mountStaticDir(app, /^\/static\/fontawesome(\/.*)$/, PATH.join(__dirname, "node_modules/fontawesome"));
            HELPERS.mountStaticFile(app, /^\/static\/jquery\.js$/, PATH.join(__dirname, "node_modules/jquery"));
            HELPERS.mountStaticDir(app, /^\/static\/bootstrap(\/.*)$/, PATH.join(__dirname, "node_modules/bootstrap/docs/assets"));

            HELPERS.mountStaticDir(app, /^\/static\/icondock-social-media-icons(\/.*)$/, PATH.join(__dirname, "node_modules/icondock-social-media-icons/Vector Social Media Icons/PNG"));
            app.get(/^\/static\/icondock-social-media-icons\.css$/, function(req, res, next) {
                var css = [];
                return GLOB("*/PNG/16px/*.png", {
                    cwd: PATH.join(__dirname, "node_modules/icondock-social-media-icons")
                }, function (err, files) {
                    if (err) return next(err);
                    files.forEach(function(filepath) {
                        var name = PATH.basename(filepath).replace(/\.png$/,"");
                        css.push(
                            "DIV.icondock-social-media-icons-16-" + name + " {",
                                "background-image: url(icondock-social-media-icons/16px/" + name + ".png);",
                                "background-repeat: no-repeat;",
                                "background-position: left top;",
                                "width: 16px;",
                                "height: 16px;",
                                "display: inline-block;",
                            "}"
                        );
                    });
                    res.setHeader("Content-Type", "text/css");
                    res.end(css.join("\n"));
                });
            });            

            return initHandlebars(function(err) {
                if (err) return callback(err);

                app.get(/^\//, function(req, res, next) {
                    EXPRESS.static(PATH.join(__dirname, "node_modules/boilerplate"))(req, res, next);
                });

                return callback(null);
            });
        });
    },
    connect: function(req, res, next) {
        try {
            return app(req, res);
        } catch(err) {
            return next(err);
        }
    }
};

for (var name in api) {
    exports[name] = api[name];
}


exports.intercept = function(handler) {
    interceptApp = function(pinf, callback) {
        try {
            return handler({
                EXPRESS: EXPRESS,
                HELPERS: HELPERS,
                WAITFOR: require("sm-util/lib/wait-for"),
                UTIL: UTIL,
                REQUEST: require("request")
            }, app, pinf, callback);
        } catch(err) {
            return callback(err);
        }
    };
    return api;
}

