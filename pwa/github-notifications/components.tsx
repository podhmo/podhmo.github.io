import { h, Fragment } from 'preact';
import type { ComponentChildren } from "preact";

// -- types ----------------------------------------
type Author = { name: string; url: string; }
type Link = { href: string; text: string; tab?: boolean }
type Message = { author: Author; text: string; cdate: string }
type NotificationType = "PullRequest" | "Issue" | "Discussion";


// -- components ----------------------------------------
export const Avatar = ({ src }: { src: string }) => {
    return <img src={src} style={{ "border-radius": "50%" }} />;
}

type GroupedRepositoryCardProps = { author: Author, children?: ComponentChildren }
export function GroupedRepositoryCard({ author, children }: GroupedRepositoryCardProps) {
    return (
        <article style={{ marginRight: "0%", paddingRight: "0%" }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={author.url} />
                <h2>{author.name}</h2>
            </div>
            {children}
        </article>
    )
}

type NotificationCardProps = { title: string, link: Link, message: Message, typ: NotificationType, children?: ComponentChildren }

export function NotificationCard({ title, link, message, typ, children }: NotificationCardProps) {
    const a = link.tab ? <a href={link.href} target="_blank" rel="noopener noreferrer">{link.text}</a> : <a href={link.href}>{link.text}</a>
    return (
        <article style={{ marginRight: "0%", paddingRight: "0%" }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={message.author.url} />
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
                <p>{message.cdate}</p>
            </div>
            {children}
        </article>
    );
}

type CommentCardProps = { message: Message }
export function CommentCard({ message }: CommentCardProps) {
    // TODO: code bock
    // <>{message.text.split("\n").map((x => <p>{x}</p>))}</>

    return (
        <article style={{ margin: 0 }}>
            <div className="grid" style={{ grid: "auto-flow / 1fr 8fr 2fr" }}>
                <Avatar src={message.author.url}></Avatar>
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

// -- mock ----------------------------------------
export function MockApp() {
    const link = (<a href="https://github.com/ocaml/ocaml/pull/12679">#12679</a>);
    return (<>
        <SectionHeader id="form" title="開閉するform"></SectionHeader>
        <details>
            <summary role="button">title</summary>
            <label>search<input type="search"></input></label>
            <button>Submit!</button>
        </details>

        <SectionHeader id="notification-1" title="コメントがないnotification"></SectionHeader>
        <NotificationCard
            title="ocaml/ocaml"
            typ="PullRequest"
            link={{ "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" }}
            message={{
                author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                cdate: "4 days ago", text: 'clarify meaning of "non-path module type"',
            }}
        >
            <p style={{ "white-space": "pre-wrap", "padding-right": "1rem" }}>oooooooooooooooooooooooooooooooooooooooo</p>
        </NotificationCard>

        <SectionHeader id="notification-2" title="コメントがあるnotification"></SectionHeader>
        <NotificationCard
            title="ocaml/ocaml"
            typ="PullRequest"
            link={{ "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" }}
            message={{
                author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                cdate: "4 days ago", text: 'clarify meaning of "non-path module type"',
            }}
        >
            <CommentCard
                message={{
                    author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                    cdate: "4 days ago", text: "The error produced when we do the following:\r\n```ocaml\r\nmodule type fst = sig\r\n  module type t := sig end\r\n  val x: (module t)\r\nend\r\n```\r\nuses the term \"non-path module type\", which is not defined in the manual. This PR replaces it with \"a module type which does not have a name\", which I think is equivalent, and should be more understandable to those who are not as familiar with module types.\r\n\r\nI don't believe this needs a changes entry, since it's just a small wording change."
                }}
            >
            </CommentCard>
            <CommentCard
                message={{
                    author: { name: "gasche", url: "https://avatars.githubusercontent.com/u/426238?s=60&v=4" },
                    cdate: "4 days ago", text: 'Technically users may not understand that `F(X).T` counts as a \"name\". Also, in your example, it is not clear why `t` does not have a name -- its name is `t`, right?\r\n\r\nI think you have a good sense of the issue but I am not sure that your proposed change is really an improvement. Should we maybe consider writing a more detailed explanation somewhere in the manual, and linking to this in the error message?'
                }}
            >
            </CommentCard>
            <CommentCard
                message={{
                    author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                    cdate: "4 days ago", text: "Here's a possible way of improving it:\r\n\r\n1) Change the wording in the manual at section 12.7.3 to include the syntactic definition of the path\r\n>If the right hand side of the substitution is not a @modtype-path@,\r\n>then the destructive substitution is only valid if the left-hand side of the\r\n>substitution is never used as the type of a first-class module in the original\r\n>module type.\r\n\r\n2) Change the wording of the error message to refer to the destructive substitution (to show that `t` is not available for naming in the final module type). Maybe:\r\n```\r\n Error: The module type \"t\" is not a valid type for a packed module:\r\n        destructive substitution of \"t\" is not possible since the resulting\r\n        packed module type cannot be named using a module type\r\n        path. (see manual section 12.7.3)\r\n```\r\n\r\n\r\nI guess this error message is more \"correct\", not sure if it's actually more helpful.\r\n"
                }}
            >
            </CommentCard>
        </NotificationCard>

        <SectionHeader id="grouped" title="repositoryでグルーピングされたnotification"></SectionHeader>
        <GroupedRepositoryCard
            author={{ name: "ocaml/ocaml", url: "https://avatars.githubusercontent.com/u/1841483?v=4&s=80" }}
        >
            <NotificationCard
                title="ocaml/ocaml"
                typ="PullRequest"
                link={{ "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" }}
                message={{
                    author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                    cdate: "4 days ago", text: 'clarify meaning of "non-path module type"',
                }}
            >
                <p style={{ "white-space": "pre-wrap", "padding-right": "1rem" }}>oooooooooooooooooooooooooooooooooooooooo</p>
            </NotificationCard>
            <NotificationCard
                title="ocaml/ocaml"
                typ="PullRequest"
                link={{ "href": "https://github.com/ocaml/ocaml/pull/12679", "text": "#12679" }}
                message={{
                    author: { name: "", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                    cdate: "4 days ago", text: 'clarify meaning of "non-path module type"',
                }}
            >
                <CommentCard
                    message={{
                        author: { name: "smuenzel", url: "https://avatars.githubusercontent.com/u/12210540?s=60&v=4" },
                        cdate: "4 days ago", text: "hello world"
                    }}
                >
                </CommentCard>
                <CommentCard
                    message={{
                        author: { name: "gasche", url: "https://avatars.githubusercontent.com/u/426238?s=60&v=4" },
                        cdate: "4 days ago", text: 'byebye world'
                    }}
                >
                </CommentCard>
            </NotificationCard>
        </GroupedRepositoryCard>
    </>);
}