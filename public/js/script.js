(() => {
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }

        form.classList.add("was-validated");
      },
      false
    );
  });
})();

let taxSwitch = document.getElementById("flexSwitchCheckDefault");
if (taxSwitch) {
  taxSwitch.addEventListener("click", () => {
    let taxInfo = document.getElementsByClassName("tax-info");
    for (const info of taxInfo) {
      if (info.style.display != "inline") {
        info.style.display = "inline";
      } else {
        info.style.display = "none";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");
  const filtersContainer = document.getElementById("filters-container");
  const filters = document.getElementById("filters");

  if (!leftBtn || !rightBtn || !filtersContainer || !filters) return;

  const filterWidth = document.querySelector(".filter").offsetWidth + 32;

  leftBtn.addEventListener("click", function () {
    filtersContainer.scrollLeft -= filterWidth;
  });

  rightBtn.addEventListener("click", function () {
    filtersContainer.scrollLeft += filterWidth;
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("filters-container");

  if (!container) return;

  let startX;
  let scrollLeft;

  container.addEventListener("touchstart", (e) => {
    startX = e.touches[0].pageX;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener("touchmove", (e) => {
    const x = e.touches[0].pageX;
    const walk = startX - x;
    container.scrollLeft = scrollLeft + walk;
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const checkIn = document.getElementById("checkIn");
  const checkOut = document.getElementById("checkOut");

  if (!checkIn || !checkOut) return;

  const setCheckoutMinimum = () => {
    if (!checkIn.value) return;

    const nextDay = new Date(`${checkIn.value}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const minimum = [
      nextDay.getFullYear(),
      String(nextDay.getMonth() + 1).padStart(2, "0"),
      String(nextDay.getDate()).padStart(2, "0"),
    ].join("-");

    checkOut.min = minimum;
    if (checkOut.value && checkOut.value < minimum) {
      checkOut.value = "";
    }
  };

  setCheckoutMinimum();
  checkIn.addEventListener("change", setCheckoutMinimum);
});
