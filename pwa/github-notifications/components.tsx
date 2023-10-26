import { h } from 'preact';
import type { ComponentChildren } from "preact";

// -- types ----------------------------------------
type Link = { href: string; text: string; }

type NotificationType = "PullRequest" | "Issue";


// -- components ----------------------------------------
export const Avatar = ({ src }: { src: string }) => {
    return <img src={src} style={{ "border-radius": "50%" }} />;
}

type CardProps = { title: string, link: Link, authorURL: string, subtitle: string, typ: NotificationType, children?: ComponentChildren }

export function Card({ title, link, subtitle, typ, authorURL, children }: CardProps) {
    return (
        <article style={{ marginRight: "0%", paddingRight: "0%" }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={authorURL} />
                <hgroup>
                    <h3>
                        {title}
                        <a href={link.href}>{link.text}</a>
                    </h3>
                    <h4>
                        {subtitle}
                        <code style={{ marginLeft: "1rem" }}>
                            <small>{typ}</small>
                        </code>
                    </h4>
                </hgroup>
                <p>17 hours ago</p>
            </div>
            {children}
        </article>
    );
}


// -- mock ----------------------------------------
export function MockApp() {
    const link = (<a href="https://github.com/ocaml/ocaml/pull/12679">#12679</a>);
    return (
        <Card authorURL="https://avatars.githubusercontent.com/u/12210540?s=60&v=4"
            title="ocaml/ocaml"
            typ="PullRequest"
            link={{ "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" }}
            subtitle='clarify meaning of "non-path module type"' >
            <p>oooooooooooooooooooooooooooooooooooooooo</p>
        </Card>
    );
}