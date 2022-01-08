#!/usr/bin/env python3
# python3 update of https://gist.github.com/dergachev/7028596
# Create a basic certificate using openssl: 
#     openssl req -new -x509 -keyout server.pem -out server.pem -days 365 -nodes
# Or to set CN, SAN and/or create a cert signed by your own root CA: https://thegreycorner.com/pentesting_stuff/writeups/selfsignedcert.html

import http.server
import ssl
import pathlib
import argparse

import logging; logging.basicConfig(level=logging.DEBUG)
here = pathlib.Path(__file__).absolute().parent

parser = argparse.ArgumentParser()
parser.add_argument("-p", "--port", default=443, type=int)
parser.add_argument("--host", default="127.0.0.1")
args = parser.parse_args()

host = args.host
port = args.port

context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(str(here / "./server.pem"))

# allow_reuse_address is already true

with http.server.HTTPServer((host, port), http.server.SimpleHTTPRequestHandler) as httpd:
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()

