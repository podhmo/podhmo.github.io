.SHELL = bash

gen:
	( echo  '<meta name="viewport" content="width=device-width, initial-scale=1">'; echo '<style> html { font-size:200%; }</style>'; ls *.html | xargs -I{} sh -c 'echo "<li><a href=\"{}\">{}</a></li>"' ) > index.html 