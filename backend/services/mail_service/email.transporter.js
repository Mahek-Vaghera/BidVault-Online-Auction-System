import { Resend } from "resend";

const MAIL_PROVIDER = (process.env.MAIL_PROVIDER || "resend").toLowerCase();
console.log("MAIL_PROVIDER:", MAIL_PROVIDER);

let resend = null;
if (MAIL_PROVIDER === "resend") {
	console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "SET" : "MISSING");
	if (process.env.RESEND_API_KEY) {
		resend = new Resend(process.env.RESEND_API_KEY);
	}
}

export default resend;