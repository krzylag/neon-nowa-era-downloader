#!/bin/bash

for svg in *.svg; do
  rsvg-convert -f pdf -o "${svg%.svg}.pdf" "$svg"
done
gs -dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite -sOutputFile=merged.pdf *.pdf
