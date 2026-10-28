(function () {
    "use strict";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const listeningStorageKey = "VoiceNavigationEnabled";
   const routes = [
    // Public Pages
    {
        path: "/",
        phrases: ["home", "home page", "homepage", "main page"]
    },
    {
        path: "/about/",
        phrases: ["about", "about us", "about page"]
    },
    {
        path: "/contact/",
        phrases: ["contact", "contact us", "contact page"]
    },
    {
        path: "/faq/",
        phrases: ["faq", "faqs", "frequently asked questions", "faq page"]
    },
    {
        path: "/login/",
        phrases: ["login", "sign in", "user login", "user sign in"]
    },
    {
        path: "/registration/",
        phrases: [
            "registration",
            "register",
            "register customer",
            "customer registration",
            "registration page"
        ]
    },
    {
        path: "/feedback/",
        phrases: ["feedback", "feedback page", "give feedback", "submit feedback"]
    },

    // Admin Pages
    {
        path: "/admin_login/",
        phrases: ["admin login", "admin sign in", "login admin", "administrator login"]
    },
    {
        path: "/admin_home/",
        phrases: ["admin home", "admin homepage", "admin dashboard", "admin panel"]
    },
    {
        path: "/admin_profile/",
        phrases: ["admin profile", "my admin profile", "administrator profile"]
    },
    {
        path: "/admin_logout/",
        phrases: ["admin logout", "admin log out", "sign out admin", "logout admin"]
    },

    // User Pages
    {
        path: "/user_home/",
        phrases: ["user home", "user homepage", "user dashboard", "user panel"]
    },
    {
        path: "/user_profile/",
        phrases: ["user profile", "my profile", "view profile", "profile page"]
    },
    {
        path: "/user_logout/",
        phrases: ["user logout", "user log out", "sign out", "log out"]
    },
    {
        path: "/user_edit_profile/",
        phrases: [
            "edit profile",
            "update profile",
            "change profile",
            "edit my profile",
            "update my details"
        ]
    },

    // Model Training
    {
        path: "/model_training/",
        phrases: [
            "model training",
            "train model",
            "train the model",
            "machine learning training"
        ]
    },

    // Song Player Pages
    {
        path: "/user_songs/",
        phrases: [
            "songs",
            "user songs",
            "song list",
            "music library",
            "show songs",
            "open songs"
        ]
    },
    {
        path: "/user_songs/1/",
        dynamic: true,
        basePath: "/user_songs/",
        phrases: [
            "play song",
            "play a song",
            "song player",
            "open song",
            "play music"
        ]
    }
];

    function cleanCommand(command) {
        return command.toLowerCase()
            .replace(/[.,!?]/g, "")
            .replace(/\b(hello assistant|please|open|go to|show me|take me to|navigate to)\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function findRoute(command) {
        const cleanedCommand = cleanCommand(command);
        const phrases = routes.reduce(function (matches, route) {
            return matches.concat(route.phrases.map(function (phrase) {
                return { phrase: phrase, route: route };
            }));
        }, []).sort(function (left, right) {
            return right.phrase.length - left.phrase.length;
        });
        const match = phrases.find(function (entry) {
            return cleanedCommand === entry.phrase || cleanedCommand.includes(entry.phrase);
        });
        return match ? match.route : undefined;
    }

    function addVoiceControl() {
        if (document.querySelector(".voice-navigation-button")) {
            return;
        }

        const button = document.createElement("button");
        const status = document.createElement("span");
        button.type = "button";
        button.className = "voice-navigation-button";
        button.setAttribute("aria-label", "Start voice page navigation");
        button.title = "Start voice page navigation";
        button.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
        status.className = "voice-navigation-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        document.body.append(button, status);

        if (!SpeechRecognition) {
            button.disabled = true;
            button.title = "Voice navigation is not supported in this browser";
            status.textContent = "Voice navigation is not supported in this browser.";
            return;
        }

        const recognition = new SpeechRecognition();
        let shouldListen = window.sessionStorage.getItem(listeningStorageKey) === "true";
        let restartTimer;
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        function startListening() {
            if (!shouldListen) {
                return;
            }
            window.clearTimeout(restartTimer);
            try {
                recognition.start();
            } catch (error) {
                if (error.name !== "InvalidStateError") {
                    status.textContent = "Click the microphone to start voice navigation.";
                }
            }
        }

        button.addEventListener("click", function () {
            shouldListen = true;
            window.sessionStorage.setItem(listeningStorageKey, "true");
            status.textContent = "Listening for page commands";
            button.classList.add("is-listening");
            button.setAttribute("aria-label", "Voice page navigation is active");
            button.title = "Voice page navigation is active";
            startListening();
        });

        recognition.addEventListener("result", function (event) {
            const command = event.results[event.resultIndex][0].transcript.trim();
            const route = findRoute(command);
            status.textContent = route ? "Opening " + command : "Page not found: " + command;
            if (route) {
                window.location.href = route.path;
            }
        });

        recognition.addEventListener("error", function (event) {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                shouldListen = false;
                window.sessionStorage.removeItem(listeningStorageKey);
                button.classList.remove("is-listening");
                status.textContent = "Microphone permission is required for voice navigation.";
            }
        });

        recognition.addEventListener("end", function () {
            if (shouldListen) {
                restartTimer = window.setTimeout(startListening, 250);
            } else {
                button.classList.remove("is-listening");
            }
        });

        if (shouldListen) {
            button.classList.add("is-listening");
            button.setAttribute("aria-label", "Voice page navigation is active");
            button.title = "Voice page navigation is active";
            status.textContent = "Listening for page commands";
            startListening();
        } else {
            status.textContent = "Click the microphone to start page navigation";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addVoiceControl);
    } else {
        addVoiceControl();
    }
}());
