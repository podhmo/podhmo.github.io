import unicodedata

print("# emoji list")
print("")
print("")
print("|char|code|name|")
print("|:--|:--|:--|")
for i in range(0x110000):
    ch = chr(i)
    if unicodedata.category(ch) == "So":
        print(f"|{ch}|{ascii(ch)}|{unicodedata.name(ch)}|")

