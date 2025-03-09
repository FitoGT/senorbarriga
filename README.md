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
Income
Expenses
Totals