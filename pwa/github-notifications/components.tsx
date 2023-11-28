import { h, Fragment } from 'preact';

import type { ComponentChildren } from "preact";
import type { SubjectTypeEnum } from "./types/enums.ts";

// -- types ----------------------------------------
type Author = { name: string; url: string | undefined; }
type Link = { href: string; text: string; tab?: boolean }
type Message = { author: Author; text: string; cdate: string }



// -- components ----------------------------------------
export const Avatar = ({ src }: { src: string }) => {
    return <img src={src} style={{ "border-radius": "50%" }} />;
}

type GroupedRepositoryCardProps = { author: Author, children?: ComponentChildren }
export function GroupedRepositoryCard({ author, children }: GroupedRepositoryCardProps) {
    return (
        <article style={{ marginRight: "0%", paddingRight: "0%" }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={author.url || ""} />
                <h2>{author.name}</h2>
            </div>
            {children}
        </article>
    )
}

type NotificationCardProps = { title: string, link: Link, message: Message, typ: SubjectTypeEnum, children?: ComponentChildren }
export function NotificationCard({ title, link, message, typ, children }: NotificationCardProps) {
    const a = link.tab ? <a href={link.href} target="_blank" rel="noopener noreferrer">{link.text}</a> : <a href={link.href}>{link.text}</a>
    return (
        <article style={{ marginRight: "0%", paddingRight: "0%" }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={message.author.url || ""} />
                <hgroup>
                    <h3>
                        {title}
                        {a}
                    </h3>
                    <h4>
                        {message.text}
                        <code style={{ marginLeft: "1rem" }}>
                            <small>{typ}</small>
                        </code>
                    </h4>
                </hgroup>
                <p><small>{message.cdate}</small></p>
            </div>
            {children}
        </article>
    );
}

type CommentCardProps = { message: Message; children?: ComponentChildren }
export function CommentCard({ message }: CommentCardProps) {
    // TODO: code bock
    // <>{message.text.split("\n").map((x => <p>{x}</p>))}</>

    return (
        <article style={{ margin: 0 }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={message.author.url || ""}></Avatar>
                <hgroup>
                    <h4>{message.author.name}</h4>
                    <p>commented {message.cdate}</p>
                </hgroup>
            </div>
            <pre style={{ padding: "1rem", "white-space": "pre-wrap" }}>{message.text}</pre>
        </article>
    );
}

export function SectionHeader({ title, id }: { title: string, id: string }) {
    return (
        <h2 id={id}><a href={"#" + id}>{title}
            <svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="1.5rem" height="1.5rem" aria-hidden="true">
                <path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"></path>
            </svg>
        </a></h2>
    )
}
