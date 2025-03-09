# senorbarriga
calcular gastos mensuales


EXPENSES
id
date
description (rent, o2, youtube, xx restaurant, rewe, amzn, etc etc)
category (ENUM)
amount
type (ENUM Percentage Shared Kari Adolfo)
isPaidByKari

INCOME
Kari 
Kari %
Adolfo
Adolfo %
Total
Total %

ENDPOINTS
Get income
Upsert income
  Kari income & Adolfo income , calculate total and %
Get expenses
Upsert expense
Delete expense (if id delete 1 is none, delete all)
Get expenses
Calculate expenses
	1. Sum by each type
        2. If percentage calculate with income
           If shared divide /2
	   If Kari 100%
	   If Adolfo subtract
	3. Sum each result and substract by kari

UI
Login-Logout
Income
Expenses
Totals

INFRASTRUCTURE
SQL DB
Backend Node Express TS
React TS
Deployed?


--------------------------------------------------------------------------------

https://zonqnxedraksextmiqhq.supabase.co
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvbnFueGVkcmFrc2V4dG1pcWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1MTQ4NTQsImV4cCI6MjA1NzA5MDg1NH0.UcPX5alf7CVqxjHFvKUCy6JZVxNwvdHdJ-zh6-l5gGU


import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zonqnxedraksextmiqhq.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)



------------------------------------------------------------------------------

primer entregable
user table con estos datos
name & email

api de query a esa tabla

ui oauth a gmail y que cheke el mail de la tabla.

hello name if success
else img de don ramon

build capacitor app



