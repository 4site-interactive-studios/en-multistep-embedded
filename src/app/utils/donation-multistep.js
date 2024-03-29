import "./confetti";
export class DonationMultistep {
  constructor() {
    this.iframe = document.getElementById("dm-iframe");
    if (!this.iframe) {
      if (this.isDebug())
        console.log("DonationMultistep: constructor: iframe not found");
      return;
    }
    console.log("DonationMultistep: constructor");
    window.dataLayer = window.dataLayer || [];
    this.defaultOptions = {
      name: "4Site Multi-Step iFrame",
      form_color: "#f26722",
      src: "",
      height: "",
      border_radius: "0",
      loading_color: "#E5E6E8",
      bounce_color: "#16233f",
      append_url_params: "false",
    };
    this.donationinfo = {};
    this.options = { ...this.defaultOptions };
    this.init();
  }
  loadOptions() {
    // Get Data Attributes
    let data = this.iframe.dataset;
    // Set Options
    if ("name" in data) this.options.name = data.name;
    if ("form_color" in data) this.options.form_color = data.form_color;
    if ("src" in data) this.options.src = data.src;
    if ("height" in data) this.options.height = data.height;
    if ("border_radius" in data)
      this.options.border_radius = data.border_radius;
    if ("loading_color" in data)
      this.options.loading_color = data.loading_color;
    if ("bounce_color" in data) this.options.bounce_color = data.bounce_color;
    if ("append_url_params" in data)
      this.options.append_url_params = data.append_url_params;
    if (this.isDebug())
      console.log("DonationMultistep: loadOptions: options: ", this.options);
  }
  init() {
    console.log("DonationMultistep: init");
    window.addEventListener("message", this.receiveMessage.bind(this), false);
    this.loadOptions();
    this.build();
  }
  build() {
    if (this.isDebug()) console.log("DonationMultistep: build");

    const src = new URL(this.options.src);

    this.containerID = "foursite-" + Math.random().toString(36).substring(7);

    src.searchParams.append("color", this.options.form_color);

    if (this.options.height) {
      src.searchParams.append("height", this.options.height);
    }

    if (this.options.append_url_params.toLowerCase() === "true") {
      const urlParams = new URLSearchParams(window.location.search);
      for (const [key, value] of urlParams) {
        src.searchParams.append(key, value);
      }
    }

    const container = document.createElement("div");
    container.classList.add("foursiteDonationMultistep-container");
    container.id = this.containerID;

    const height = this.options.height ?? "400px";

    const markup = `
        <div class="dm-content" style="border-radius: ${this.options.border_radius}">
            <div class="dm-loading" style="background-color: ${this.options.loading_color}">
              <div class="spinner">
                <div class="double-bounce1" style="background-color: ${this.options.bounce_color}"></div>
                <div class="double-bounce2" style="background-color: ${this.options.bounce_color}"></div>
              </div>
            </div>
            <iframe style='height: ${height}; min-height: ${height};' allow='payment' loading='lazy' id='dm-iframe' width='100%' scrolling='no' class='dm-iframe' src='${src}' frameborder='0' allowfullscreen></iframe>
        </div>
            `;
    container.innerHTML = markup;

    this.container = container;
    this.iframe.parentNode.insertBefore(this.container, this.iframe);
    this.iframe.remove();
    this.iframe = document.getElementById("dm-iframe");
    this.iframe.addEventListener("load", () => {
      const action = "Viewed";
      const category = "Multistep iFrame";
      const label = this.options.name;
      this.sendGAEvent(category, action, label);
      this.status("loaded");
    });
  }

  // Receive a message from the child iframe
  receiveMessage(event) {
    // console.log("DonationMultistep: receiveMessage: event: ", event.data);
    const message = event.data;

    if (message && "frameHeight" in message) {
      this.iframe.style.height = message.frameHeight + "px";
      if ("scroll" in message && !this.isInViewport(this.iframe)) {
        // Scroll to the top of the iframe smoothly
        this.iframe.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      return;
    }

    switch (message.key) {
      case "status":
        this.status(message.value, event);
        break;
      case "error":
        this.error(message.value, event);
        break;
      case "class":
        this.container.classList.add(message.value);
        break;
      case "donationinfo":
        this.donationinfo = JSON.parse(message.value);
        console.log(
          "DonationMultistep: receiveMessage: donationinfo: ",
          this.donationinfo
        );
        break;
      case "firstname":
        const firstname = message.value;
        const nameHeading = document.querySelector(".dm-celebration h2.name");
        if (nameHeading) {
          nameHeading.innerHTML = firstname + ",";
          if (firstname.length > 12) {
            nameHeading.classList.add("big-name");
          }
        }
        break;
    }
  }
  status(status, event) {
    switch (status) {
      case "loading":
        document.querySelector(".dm-loading").classList.remove("is-loaded");
        break;
      case "loaded":
        document.querySelector(".dm-loading").classList.add("is-loaded");
        break;
      case "submitted":
        this.donationinfo.frequency =
          this.donationinfo.frequency == "no"
            ? ""
            : this.donationinfo.frequency;
        let iFrameUrl = new URL(document.getElementById("dm-iframe").src);
        for (const key in this.donationinfo) {
          iFrameUrl.searchParams.append(key, this.donationinfo[key]);
        }
        document.getElementById("dm-iframe").src = iFrameUrl
          .toString()
          .replace("/donate/1", "/donate/2");
        break;
      case "celebrate":
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (!motion.matches) {
          this.startConfetti();
        }
        break;
    }
  }
  error(error, event) {
    this.shake();
    // console.error(error);
    const container = this.container.querySelector(".dm-content");
    const errorMessage = document.createElement("div");
    errorMessage.classList.add("error-message");
    errorMessage.style.borderRadius = this.options.border_radius;
    errorMessage.innerHTML = `<p>${error}</p><a class="close" href="#">Close</a>`;
    errorMessage.querySelector(".close").addEventListener("click", (e) => {
      e.preventDefault();
      errorMessage.classList.remove("dm-is-visible");
      // One second after close animation ends, remove the error message
      setTimeout(() => {
        errorMessage.remove();
      }, 1000);
    });
    container.appendChild(errorMessage);
    // 300ms after error message is added, show the error message
    setTimeout(() => {
      errorMessage.classList.add("dm-is-visible");
      // Five seconds after error message is shown, remove the error message
      setTimeout(() => {
        errorMessage.querySelector(".close").click();
      }, 5000);
    }, 300);
  }
  startConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 100000,
      useWorker: false,
    };

    const randomInRange = (min, max) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);
  }
  shake() {
    this.container.classList.add("shake");
    // Remove class after 1 second
    setTimeout(() => {
      this.container.classList.remove("shake");
    }, 1000);
  }
  sendGAEvent(category, action, label) {
    if ("sendEvent" in window) {
      window.sendEvent(category, action, label, null);
    } else {
      window.dataLayer.push({
        event: "event",
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
      });
    }
  }
  isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      // rect.bottom <=
      //   (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  isDebug() {
    const regex = new RegExp("[\\?&]debug=([^&#]*)");
    const results = regex.exec(location.search);
    return results === null
      ? ""
      : decodeURIComponent(results[1].replace(/\+/g, " "));
  }
}
