var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose=require("mongoose");
var Campground=require("./models/campground");
var Comment=require("./models/comments");
var User=require("./models/user");
var methodOverride = require("method-override");
var seedDb=require("./seeds");
var passport=require("passport");
var LocalStrategy=require("passport-local");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(require("express-session")({
    secret: "Rusty is the best and cutest dog in the world",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
mongoose.connect('mongodb://localhost/campgrounds');
//seedDb();
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   next();
});
    
app.get("/", function(req, res){
    res.render("land");
});

//INDEX - show all campgrounds
app.get("/campgrounds", function(req, res){
    // Get all campgrounds from DB
    Campground.find({}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else {
          res.render("camps",{campgrounds:allCampgrounds,currentUser:req.user});
       }
    });
});

//CREATE - add new campground to DB
app.post("/campgrounds",function(req, res){
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var image = req.body.image;
    var desc = req.body.description;
	 var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground = {name: name, image: image, description: desc,author:author}
    // Create a new campground and save to DB
    Campground.create(newCampground, function(err, newlyCreated){
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds");
        }
    });
});

//NEW - show form to create new campground
app.get("/campgrounds/new",isLoggedIn, function(req, res){
   res.render("reg.ejs"); 
});

// SHOW - shows more info about one campground
app.get("/campgrounds/:id",isLoggedIn, function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            //render show template with that campground
            res.render("id", {campground: foundCampground});
        }
    });
})
///

app.get("/campgrounds/:id/comments/new",isLoggedIn,function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id,function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            //render show template with that campground
            res.render("new", {campground: foundCampground});
        }
    });
})

app.post("/campgrounds/:id/comments", function(req, res){

   Campground.findById(req.params.id, function(err, campground){
       if(err){
           console.log(err);
           res.redirect("/campgrounds");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               campground.comments.push(comment);
               campground.save();
               res.redirect('/campgrounds/' + campground._id);
           }
        });
       }
   });
	});

app.get("/campgrounds/:id/edit",LoggedIn, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND ROUTE
app.put("/campgrounds/:id",LoggedIn, function(req, res){
    // find and update the correct campground
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
       if(err){
           res.redirect("/campgrounds");
       } else {
           //redirect somewhere(show page)
           res.redirect("/campgrounds/" + req.params.id);
       }
    });
});

// DESTROY CAMPGROUND ROUTE
app.delete("/campgrounds/:id",LoggedIn, function(req, res){
   Campground.findByIdAndRemove(req.params.id, function(err){
      if(err){
          res.redirect("/campgrounds");
      } else {
          res.redirect("/campgrounds");
      }
   });
});

app.get("/register",function(req,res)
	   {
	res.render("regi");
});

app.post("/register",function(req,res)
	   {
	  User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render('regi');
        }
        passport.authenticate("local")(req, res, function(){
           res.redirect("/campgrounds");
        });
    });
});


app.get("/login", function(req, res){
   res.render("login"); 
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login"
}) ,function(req, res){
});

app.get("/logout", function(req, res){
	req.logout();
   res.redirect("/campgrounds"); 
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}
function LoggedIn(req, res, next){
 if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
           if(err){
               res.redirect("back");
           }  else {
               // does user own the comment?
            if(foundComment.author.id.equals(req.user._id)) {
                next();
            } else {
                res.redirect("back");
            }
           }
        });
    } else {
        res.redirect("back");
    }
}
app.listen(3000,function()
		  {
	console.log("connected");
});