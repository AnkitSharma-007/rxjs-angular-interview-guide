/* Accessibility: name the theme's ARIA landmarks that ship without labels.
   (Search container has role="dialog", instant-loading bar has role="progressbar".) */
document.addEventListener("DOMContentLoaded", function () {
  var search = document.querySelector('.md-search[role="dialog"]');
  if (search && !search.hasAttribute("aria-label")) {
    search.setAttribute("aria-label", "Site search");
  }
  var progress = document.querySelector('.md-progress[role="progressbar"]');
  if (progress && !progress.hasAttribute("aria-label")) {
    progress.setAttribute("aria-label", "Page loading progress");
  }
});
