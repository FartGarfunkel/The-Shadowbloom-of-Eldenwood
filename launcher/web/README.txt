EMBERWILD — INSTALLABLE WEB VERSION (Android, Chromebooks, iPhone/iPad, any computer)

This folder is the game as an installable web app. When it's opened from a web
address, phones and computers can install it: it gets its own icon, opens full
screen like an app, and keeps working with no internet connection.

Phones can't install a web app from a file on the phone, so the folder has to
be on the web once. Any free static host works. The easiest:

  GitHub Pages (free, permanent)
    1. Make a free account at github.com and create a new public repository,
       for example "emberwild".
    2. On the repository page choose "Add file" > "Upload files" and drag in
       everything in this folder (index.html, manifest.webmanifest, sw.js and
       the icons folder). Commit.
    3. Settings > Pages > Source: "Deploy from a branch", branch "main", folder
       "/ (root)". Save. After a minute the page shows your address, like
       https://yourname.github.io/emberwild/

  Netlify Drop
    Go to app.netlify.com/drop, sign in, and drag this whole folder onto the
    page. It gives you an address straight away.

Installing it
  Android (Chrome):   open the address, then menu (three dots) > "Install app"
                      or "Add to Home screen".
  iPhone/iPad:        open it in Safari, Share > "Add to Home Screen".
  Windows/Linux/Mac:  open it in Chrome or Edge, then the install icon at the
                      right end of the address bar.

Updating
  Upload the new version's files over the old ones. The installed app picks
  the update up the next time it starts while online. Your worlds are kept in
  the app's storage on each device and are not touched by updates. Use
  "Download world backup" in the pause menu to move a world between devices.
