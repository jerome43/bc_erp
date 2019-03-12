Pour prendre en compte de nouvelles polices.
se placer dans le présent dossier fonts et exécuter la commande shell suivante :
script.sh font1.ttf font2.ttf font3.ttf
en adaptant avec les fichiers de polices chargés dans le dossier font.
NB : cela génère le fichier vfs_fonts.js qui est ensuite appelé dana pdfservice pour charger les fonts.
dans pdfservice, il faut ensuite charger les fonts avec pdfMake.fonts = {...}
see : 
https://pdfmake.github.io/docs/fonts/custom-fonts-client-side/shell/
