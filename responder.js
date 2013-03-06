
const PATH = require("path");
const EXPRESS = require("express");
const HBS = require("hbs");


var app = null;

exports.init = function(pinf, callback) {

	var config = pinf.config();

    app = EXPRESS();

    app.get(/^\/static\/fuelux(\/.*)$/, function(req, res, next) {
        req.url = req.params[0];
        EXPRESS.static(PATH.join(__dirname, "node_modules/fuelux/dist"))(req, res, next);
    });

    app.get(/^\/static\/fontawesome(\/.*)$/, function(req, res, next) {
        req.url = req.params[0];
        EXPRESS.static(PATH.join(__dirname, "node_modules/fontawesome"))(req, res, next);
    });

    app.get(/^\/static\/jquery\.js$/, function(req, res, next) {
        req.url = "/response-body";
        res.setHeader("Content-Type", "application/javascript");
        EXPRESS.static(PATH.join(__dirname, "node_modules/jquery"))(req, res, next);
    });

    app.get(/^\/static\/bootstrap(\/.*)$/, function(req, res, next) {
        req.url = req.params[0];
        EXPRESS.static(PATH.join(__dirname, "node_modules/bootstrap/docs/assets"))(req, res, next);
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
	        res.render(req.params[0] || "index");
	    } catch(err) {
	    	return next();
	    }
    });

    app.get(/^\//, function(req, res, next) {
        EXPRESS.static(PATH.join(__dirname, "node_modules/boilerplate"))(req, res, next);
    });

    return callback(null);
}

exports.connect = function(req, res, next) {
	try {
		return app(req, res);
	} catch(err) {
		return next(err);
	}
}
